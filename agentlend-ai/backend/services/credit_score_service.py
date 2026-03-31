"""
AgentLend AI — Credit Score Service
=====================================
Computes a borrower credit score from on-chain + repayment data.

Formula
-------
credit_score = 0.5 * repayment_rate + 0.3 * norm(wallet_age) + 0.2 * norm(tx_count)

The raw result (0-1) is scaled to 0-850 (conventional credit-score range).
"""

from __future__ import annotations

import logging
from typing import Optional

from sqlalchemy.orm import Session

from config import get_settings
from database.models import User

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Normalisation constants ──────────────────────────────────────
# These cap the input so that extremely large values don't dominate.

MAX_WALLET_AGE_DAYS = 730.0    # 2 years → normalised 1.0
MAX_TX_COUNT = 500             # 500 txs  → normalised 1.0
SCORE_CEILING = 850.0          # traditional credit-score ceiling


# ── Public API ──────────────────────────────────────────────────

def _normalise(value: float, max_value: float) -> float:
    """Clamp *value* into [0, 1] using *max_value* as the upper bound."""
    if max_value <= 0:
        return 0.0
    return min(value / max_value, 1.0)


def compute_credit_score(
    repayment_rate: float,
    wallet_age: float,
    transaction_count: int,
    min_score: float = 0.0,
) -> float:
    """
    Compute a credit score in the range [0, 850].

    Parameters
    ----------
    repayment_rate : float   — fraction 0.0 – 1.0
    wallet_age     : float   — wallet age in days
    transaction_count : int  — total on-chain transactions

    Returns
    -------
    float  — credit score (0 – 850)
    """
    norm_repayment = min(max(repayment_rate, 0.0), 1.0)
    norm_age = _normalise(wallet_age, MAX_WALLET_AGE_DAYS)
    norm_tx = _normalise(float(transaction_count), float(MAX_TX_COUNT))

    raw = 0.5 * norm_repayment + 0.3 * norm_age + 0.2 * norm_tx
    score = round(max(raw * SCORE_CEILING, min_score), 2)

    logger.info(
        "Credit score computed → repay=%.2f, age_norm=%.2f, tx_norm=%.2f → score=%.2f",
        norm_repayment,
        norm_age,
        norm_tx,
        score,
    )
    return score


def update_user_credit_score(
    db: Session,
    wallet_address: str,
    wallet_age: float,
    transaction_count: int,
) -> float:
    """
    Recompute the credit score for a user and persist it. If the user
    doesn't exist yet, create a new record.

    Returns the new credit score.
    """
    user: Optional[User] = (
        db.query(User)
        .filter(User.wallet_address == wallet_address.lower())
        .first()
    )

    if user is None:
        user = User(
            wallet_address=wallet_address.lower(),
            wallet_age=wallet_age,
            transaction_count=transaction_count,
            repayment_rate=settings.COLD_START_NEUTRAL_REPAYMENT_RATE,
        )
        db.add(user)
        db.flush()  # get user_id

    # Always refresh on-chain fields
    user.wallet_age = wallet_age
    user.transaction_count = transaction_count

    is_cold_start = wallet_age <= settings.COLD_START_MAX_WALLET_AGE_DAYS and transaction_count <= settings.COLD_START_MAX_TX_COUNT

    new_score = compute_credit_score(
        repayment_rate=user.repayment_rate,
        wallet_age=wallet_age,
        transaction_count=transaction_count,
        min_score=settings.COLD_START_BASE_CREDIT_SCORE if is_cold_start else 0.0,
    )
    user.credit_score = new_score
    db.commit()
    db.refresh(user)

    logger.info("User %s credit score updated to %.2f", wallet_address, new_score)
    return new_score
