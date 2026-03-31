"""
AgentLend AI — Decision Logger
================================
Persists every AI lending decision with full model reasoning.
Creates an auditable trail of all approve / reject decisions.
"""

from __future__ import annotations

import logging
from typing import List, Optional

from sqlalchemy.orm import Session

from database.models import DecisionLog
from database.schemas import RiskEvaluation

logger = logging.getLogger(__name__)


def log_decision(
    db: Session,
    wallet_address: str,
    loan_id: Optional[int],
    evaluation: RiskEvaluation,
) -> DecisionLog:
    """
    Create a DecisionLog entry from a completed RiskEvaluation.

    Parameters
    ----------
    db             : active SQLAlchemy session
    wallet_address : borrower wallet
    loan_id        : associated loan (may be None for pre-screening)
    evaluation     : structured AI model output

    Returns
    -------
    DecisionLog — the persisted record
    """
    entry = DecisionLog(
        wallet_address=wallet_address.lower(),
        loan_id=loan_id,
        decision=evaluation.decision,
        risk_score=evaluation.risk_score,
        interest_rate=evaluation.interest_rate,
        reason=evaluation.reason,
        ai_explanation=evaluation.ai_explanation,
    )
    db.add(entry)
    db.flush()

    logger.info(
        "Decision logged [#%s] wallet=%s loan=%s → %s (risk=%.1f)",
        entry.log_id,
        wallet_address,
        loan_id,
        evaluation.decision,
        evaluation.risk_score,
    )
    return entry


def get_all_decision_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
) -> List[DecisionLog]:
    """Return decision logs ordered by most recent first."""
    return (
        db.query(DecisionLog)
        .order_by(DecisionLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_decision_logs_for_wallet(
    db: Session,
    wallet_address: str,
) -> List[DecisionLog]:
    """Return all decision logs for a specific wallet."""
    return (
        db.query(DecisionLog)
        .filter(DecisionLog.wallet_address == wallet_address.lower())
        .order_by(DecisionLog.timestamp.desc())
        .all()
    )
