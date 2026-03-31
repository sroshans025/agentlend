"""
AgentLend AI — Loan Service
=============================
Orchestrates the full loan lifecycle:
  request → analyze → score → AI evaluate → log → disburse → persist.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from config import get_settings
from database.models import Loan, LoanStatus, User
from database.schemas import RiskEvaluation, WalletAnalytics
from services.onchain_analyzer import analyze_wallet
from services.credit_score_service import update_user_credit_score
from services.decision_logger import log_decision
from ai_agent.risk_agent import evaluate_risk
from blockchain.wdk_wallet import send_transaction

logger = logging.getLogger(__name__)
settings = get_settings()


def _is_cold_start_candidate(
    analytics: WalletAnalytics,
    loan_amount: float,
) -> bool:
    if not settings.COLD_START_ENABLED:
        return False

    return (
        loan_amount <= settings.COLD_START_MAX_LOAN_AMOUNT
        and analytics.wallet_age <= settings.COLD_START_MAX_WALLET_AGE_DAYS
        and analytics.transaction_count <= settings.COLD_START_MAX_TX_COUNT
    )


def _apply_cold_start_override(evaluation: RiskEvaluation) -> RiskEvaluation:
    return RiskEvaluation(
        risk_score=min(evaluation.risk_score, settings.COLD_START_RISK_SCORE),
        decision="APPROVED",
        interest_rate=max(evaluation.interest_rate, settings.COLD_START_INTEREST_RATE),
        reason="Cold-start micro-loan policy applied for new wallet.",
        ai_explanation=(
            "Borrower has limited on-chain history, but qualifies for onboarding micro-credit. "
            f"Approved within cold-start cap (≤ {settings.COLD_START_MAX_LOAN_AMOUNT} USDT) "
            f"at {settings.COLD_START_INTEREST_RATE:.1f}% interest for trust building."
        ),
    )


def process_loan_request(
    db: Session,
    wallet_address: str,
    loan_amount: float,
    loan_duration: int,
) -> Loan:
    """
    End-to-end loan processing pipeline.

    1. Fetch wallet analytics (on-chain)
    2. Upsert user & compute credit score
    3. Call AI risk agent (AWS Bedrock)
    4. Log AI decision with reasoning
    5. If APPROVED → send funds on-chain via WDK/Web3
    6. Persist & return the Loan record

    Raises ValueError for invalid inputs.
    """
    wallet_address = wallet_address.strip().lower()

    # ── Input validation ────────────────────────────────────────
    if loan_amount < settings.MIN_LOAN_AMOUNT:
        raise ValueError(f"Loan amount must be ≥ {settings.MIN_LOAN_AMOUNT}")
    if loan_amount > settings.MAX_LOAN_AMOUNT:
        raise ValueError(f"Loan amount must be ≤ {settings.MAX_LOAN_AMOUNT}")
    if loan_duration <= 0:
        raise ValueError("Loan duration must be > 0 days")

    # ── Step 1: On-chain wallet analysis ────────────────────────
    logger.info("Step 1 — Analyzing wallet %s", wallet_address)
    analytics: WalletAnalytics = analyze_wallet(wallet_address)

    # ── Step 2: Upsert user & credit score ──────────────────────
    logger.info("Step 2 — Computing credit score")
    credit_score = update_user_credit_score(
        db=db,
        wallet_address=wallet_address,
        wallet_age=analytics.wallet_age,
        transaction_count=analytics.transaction_count,
    )

    # Fetch user record (guaranteed to exist after upsert)
    user: User = (
        db.query(User)
        .filter(User.wallet_address == wallet_address)
        .first()
    )

    # ── Step 3: AI risk evaluation ──────────────────────────────
    logger.info("Step 3 — Running AI risk evaluation (AWS Bedrock)")
    evaluation: RiskEvaluation = evaluate_risk(
        wallet_age=analytics.wallet_age,
        transaction_count=analytics.transaction_count,
        repayment_rate=user.repayment_rate,
        loan_amount=loan_amount,
        loan_duration=loan_duration,
        credit_score=credit_score,
    )

    if evaluation.decision == "REJECTED" and _is_cold_start_candidate(analytics, loan_amount):
        logger.info(
            "Cold-start override applied for wallet=%s amount=%.2f",
            wallet_address,
            loan_amount,
        )
        evaluation = _apply_cold_start_override(evaluation)

    # ── Step 4: Create loan record ──────────────────────────────
    due_date = datetime.now(timezone.utc) + timedelta(days=loan_duration)

    loan = Loan(
        borrower_wallet=wallet_address,
        amount=loan_amount,
        interest_rate=evaluation.interest_rate,
        risk_score=evaluation.risk_score,
        due_date=due_date if evaluation.decision == "APPROVED" else None,
        status=LoanStatus.PENDING,
        transaction_hash=None,
    )
    db.add(loan)
    db.flush()  # get loan_id for the decision log

    # ── Step 5: Log AI decision ─────────────────────────────────
    logger.info("Step 5 — Logging AI decision")
    log_decision(
        db=db,
        wallet_address=wallet_address,
        loan_id=loan.loan_id,
        evaluation=evaluation,
    )

    # ── Step 6: Execute on-chain transaction if approved ────────
    if evaluation.decision == "APPROVED":
        logger.info("Step 6 — Sending %s USDT to %s", loan_amount, wallet_address)
        tx_hash: Optional[str] = send_transaction(
            to_address=wallet_address,
            amount=loan_amount,
        )
        if tx_hash:
            loan.transaction_hash = tx_hash
            loan.status = LoanStatus.ACTIVE
            logger.info("Loan %d ACTIVE — tx %s", loan.loan_id, tx_hash)
        else:
            # On-chain send failed; keep PENDING so it can be retried
            logger.warning("On-chain send failed for loan %d — staying PENDING", loan.loan_id)
    else:
        # Rejected by AI
        loan.status = LoanStatus.DEFAULTED  # Using DEFAULTED to represent rejection
        logger.info("Loan %d REJECTED by AI (risk=%.1f)", loan.loan_id, evaluation.risk_score)

    db.commit()
    db.refresh(loan)
    return loan


def get_loan_by_id(db: Session, loan_id: int) -> Optional[Loan]:
    """Retrieve a single loan by ID."""
    return db.query(Loan).filter(Loan.loan_id == loan_id).first()


def get_all_loans(db: Session, skip: int = 0, limit: int = 100) -> list[Loan]:
    """Return all loans with pagination."""
    return db.query(Loan).order_by(Loan.created_at.desc()).offset(skip).limit(limit).all()


def get_pending_loans(db: Session) -> list[Loan]:
    """Return loans that are still PENDING (awaiting autonomous agent processing)."""
    return db.query(Loan).filter(Loan.status == LoanStatus.PENDING).all()
