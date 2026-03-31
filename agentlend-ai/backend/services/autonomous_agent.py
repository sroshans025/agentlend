"""
AgentLend AI — Autonomous Lending Agent
=========================================
Task-based agent cycle that runs on a scheduled interval inside the
FastAPI lifespan.

Each cycle the agent:
  1. Fetches PENDING loan requests
  2. For each pending loan:
     a. Analyze borrower wallet on-chain
     b. Compute / refresh credit score
     c. Call AI risk evaluation (AWS Bedrock)
     d. Log AI reasoning
     e. Approve or reject
     f. Execute blockchain transaction if approved
     g. Update database
  3. Sleep until next interval

The agent operates without any human prompts once deployed.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from config import get_settings
from database.db import SessionLocal
from database.models import Loan, LoanStatus, User
from database.schemas import RiskEvaluation, WalletAnalytics
from services.onchain_analyzer import analyze_wallet
from services.credit_score_service import update_user_credit_score
from ai_agent.risk_agent import evaluate_risk
from services.decision_logger import log_decision
from blockchain.wdk_wallet import send_transaction

logger = logging.getLogger(__name__)
settings = get_settings()


def _process_single_loan(db: Session, loan: Loan) -> None:
    """
    Process one PENDING loan through the full AI evaluation pipeline.

    This function is intentionally synchronous — it runs inside the async
    agent loop via ``asyncio.to_thread`` or directly if the event loop
    allows blocking calls (acceptable for a hackathon setup).
    """
    wallet = loan.borrower_wallet
    logger.info("═══ Agent processing loan #%d for wallet %s ═══", loan.loan_id, wallet)

    try:
        # ── 1. On-chain analysis ────────────────────────────────
        analytics: WalletAnalytics = analyze_wallet(wallet)

        # ── 2. Credit score ─────────────────────────────────────
        credit_score = update_user_credit_score(
            db=db,
            wallet_address=wallet,
            wallet_age=analytics.wallet_age,
            transaction_count=analytics.transaction_count,
        )

        user: Optional[User] = (
            db.query(User).filter(User.wallet_address == wallet).first()
        )
        repayment_rate = user.repayment_rate if user else 0.0

        # ── 3. AI risk evaluation (AWS Bedrock) ─────────────────
        # Infer loan_duration from due_date or use default
        if loan.due_date:
            remaining = (loan.due_date - datetime.now(timezone.utc)).days
            loan_duration = max(remaining, 1)
        else:
            loan_duration = settings.DEFAULT_LOAN_DURATION_DAYS

        evaluation: RiskEvaluation = evaluate_risk(
            wallet_age=analytics.wallet_age,
            transaction_count=analytics.transaction_count,
            repayment_rate=repayment_rate,
            loan_amount=loan.amount,
            loan_duration=loan_duration,
            credit_score=credit_score,
        )

        # ── 4. Log AI decision ──────────────────────────────────
        log_decision(
            db=db,
            wallet_address=wallet,
            loan_id=loan.loan_id,
            evaluation=evaluation,
        )

        # ── 5. Execute decision ─────────────────────────────────
        if evaluation.decision == "APPROVED":
            loan.interest_rate = evaluation.interest_rate
            loan.risk_score = evaluation.risk_score
            loan.due_date = datetime.now(timezone.utc) + timedelta(days=loan_duration)

            tx_hash: Optional[str] = send_transaction(
                to_address=wallet,
                amount=loan.amount,
            )

            if tx_hash:
                loan.transaction_hash = tx_hash
                loan.status = LoanStatus.ACTIVE
                logger.info(
                    "Loan #%d APPROVED & ACTIVE → tx %s", loan.loan_id, tx_hash
                )
            else:
                logger.warning(
                    "Loan #%d approved by AI but on-chain tx failed — remains PENDING",
                    loan.loan_id,
                )
        else:
            loan.risk_score = evaluation.risk_score
            loan.status = LoanStatus.DEFAULTED  # represents REJECTED
            logger.info(
                "Loan #%d REJECTED by AI (risk=%.1f): %s",
                loan.loan_id,
                evaluation.risk_score,
                evaluation.reason,
            )

        db.commit()

    except Exception as exc:
        logger.error(
            "Agent failed processing loan #%d: %s", loan.loan_id, exc, exc_info=True
        )
        db.rollback()


async def run_autonomous_agent() -> None:
    """
    Long-running coroutine — the autonomous lending loop.

    Runs every AGENT_LOOP_INTERVAL_SECONDS.
    """
    interval = settings.AGENT_LOOP_INTERVAL_SECONDS
    logger.info("Autonomous lending agent started (interval=%ds)", interval)

    while True:
        try:
            db: Session = SessionLocal()
            try:
                pending_loans: List[Loan] = (
                    db.query(Loan)
                    .filter(Loan.status == LoanStatus.PENDING)
                    .order_by(Loan.created_at.asc())
                    .all()
                )

                if pending_loans:
                    logger.info(
                        "Agent cycle: %d pending loan(s) to process", len(pending_loans)
                    )
                    for loan in pending_loans:
                        _process_single_loan(db, loan)
                else:
                    logger.debug("Agent cycle: no pending loans.")
            finally:
                db.close()

        except Exception as exc:
            logger.error("Autonomous agent cycle error: %s", exc, exc_info=True)

        await asyncio.sleep(interval)
