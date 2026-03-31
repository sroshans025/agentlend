"""
AgentLend AI — Repayment Monitor
==================================
Background worker that periodically scans for incoming token transfers
to the treasury wallet, matches them to active loans, and marks loans
as REPAID.

Designed to run as an asyncio task inside the FastAPI lifespan.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any

from sqlalchemy.orm import Session

from config import get_settings
from database.db import SessionLocal
from database.models import Loan, LoanStatus, Repayment, User
from blockchain.blockchain_scanner import get_incoming_token_transfers

logger = logging.getLogger(__name__)
settings = get_settings()

# Track the last processed block to avoid re-scanning
_last_scanned_block: int = 0


def _match_repayment(
    db: Session,
    transfer: Dict[str, Any],
) -> None:
    """
    Attempt to match an incoming token transfer to an active loan.

    Matching logic:
    - The sender address (transfer["from"]) must have an ACTIVE loan.
    - The transferred amount is recorded as a repayment.
    - If total repayments >= loan amount, the loan is marked REPAID.
    """
    sender = transfer.get("from", "").lower()
    tx_hash = transfer.get("hash", "")
    decimals = int(transfer.get("tokenDecimal", settings.TOKEN_DECIMALS))
    raw_value = int(transfer.get("value", 0))
    amount = raw_value / (10 ** decimals)

    if amount <= 0:
        return

    # Check if we already recorded this tx_hash
    existing = db.query(Repayment).filter(Repayment.tx_hash == tx_hash).first()
    if existing:
        return  # already processed

    # Find active loans for this sender
    active_loans: List[Loan] = (
        db.query(Loan)
        .filter(Loan.borrower_wallet == sender, Loan.status == LoanStatus.ACTIVE)
        .order_by(Loan.created_at.asc())
        .all()
    )

    if not active_loans:
        logger.debug("No active loan found for sender %s — ignoring transfer.", sender)
        return

    # Apply repayment to the oldest active loan
    loan = active_loans[0]

    repayment = Repayment(
        loan_id=loan.loan_id,
        amount=amount,
        tx_hash=tx_hash,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(repayment)
    db.flush()

    # Calculate total repaid for this loan
    total_repaid: float = sum(r.amount for r in loan.repayments) + amount
    total_due = loan.amount * (1 + loan.interest_rate / 100)

    logger.info(
        "Repayment recorded: loan=%d amount=%.4f total_repaid=%.4f / %.4f due",
        loan.loan_id,
        amount,
        total_repaid,
        total_due,
    )

    if total_repaid >= total_due:
        loan.status = LoanStatus.REPAID
        logger.info("Loan %d fully REPAID ✓", loan.loan_id)

        # Update borrower repayment rate
        _update_repayment_rate(db, sender)

    db.commit()


def _update_repayment_rate(db: Session, wallet_address: str) -> None:
    """Recalculate repayment_rate for a borrower after a repayment event."""
    user: User | None = (
        db.query(User).filter(User.wallet_address == wallet_address).first()
    )
    if not user:
        return

    total_loans = (
        db.query(Loan)
        .filter(
            Loan.borrower_wallet == wallet_address,
            Loan.status.in_([LoanStatus.ACTIVE, LoanStatus.REPAID, LoanStatus.DEFAULTED]),
        )
        .count()
    )
    repaid_loans = (
        db.query(Loan)
        .filter(Loan.borrower_wallet == wallet_address, Loan.status == LoanStatus.REPAID)
        .count()
    )

    user.repayment_rate = repaid_loans / total_loans if total_loans > 0 else 0.0
    logger.info(
        "Updated repayment rate for %s → %.2f (%d/%d)",
        wallet_address,
        user.repayment_rate,
        repaid_loans,
        total_loans,
    )


async def run_repayment_monitor() -> None:
    """
    Long-running coroutine that polls for new incoming transfers every
    REPAYMENT_MONITOR_INTERVAL_SECONDS.
    """
    global _last_scanned_block
    interval = settings.REPAYMENT_MONITOR_INTERVAL_SECONDS
    treasury = settings.TREASURY_WALLET_ADDRESS

    if not treasury:
        logger.warning("TREASURY_WALLET_ADDRESS not set — repayment monitor disabled.")
        return

    logger.info(
        "Repayment monitor started (interval=%ds, treasury=%s)",
        interval,
        treasury,
    )

    while True:
        try:
            transfers = get_incoming_token_transfers(
                wallet_address=treasury,
                from_block=_last_scanned_block,
            )

            if transfers:
                db: Session = SessionLocal()
                try:
                    for tx in transfers:
                        _match_repayment(db, tx)
                        block_num = int(tx.get("blockNumber", 0))
                        if block_num > _last_scanned_block:
                            _last_scanned_block = block_num
                finally:
                    db.close()

                logger.info(
                    "Processed %d incoming transfers (last_block=%d)",
                    len(transfers),
                    _last_scanned_block,
                )
            else:
                logger.debug("No new incoming transfers.")

        except Exception as exc:
            logger.error("Repayment monitor error: %s", exc, exc_info=True)

        await asyncio.sleep(interval)
