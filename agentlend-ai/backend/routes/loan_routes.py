"""
AgentLend AI — Loan Routes
============================
POST /loan/request   → submit a new loan request
GET  /loan/{loan_id} → check loan status
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.db import get_db
from database.schemas import LoanRequest, LoanResponse
from services.loan_service import process_loan_request, get_loan_by_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/loan", tags=["Loans"])


@router.post("/request", response_model=LoanResponse)
def request_loan(payload: LoanRequest, db: Session = Depends(get_db)):
    """
    Submit a new loan request.

    The system will:
    1. Analyze the borrower's on-chain wallet history
    2. Compute a credit score
    3. Run AI risk evaluation (AWS Bedrock)
    4. Log the AI decision with full reasoning
    5. Approve or reject the loan
    6. If approved, send funds on-chain via WDK / Web3
    """
    try:
        loan = process_loan_request(
            db=db,
            wallet_address=payload.wallet_address,
            loan_amount=payload.loan_amount,
            loan_duration=payload.loan_duration,
        )
        return loan
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Loan request failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error processing loan request.")


@router.get("/{loan_id}", response_model=LoanResponse)
def get_loan(loan_id: int, db: Session = Depends(get_db)):
    """Return the status and details of a specific loan."""
    loan = get_loan_by_id(db, loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found.")
    return loan
