"""
AgentLend AI — Pydantic Schemas (Request / Response)
=====================================================
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ── Loan Request / Response ──────────────────────────────────────

class LoanRequest(BaseModel):
    wallet_address: str = Field(..., min_length=42, max_length=42, description="Borrower EVM wallet address")
    loan_amount: float = Field(..., gt=0, description="Requested loan amount in token units")
    loan_duration: int = Field(..., gt=0, description="Loan duration in days")


class LoanResponse(BaseModel):
    loan_id: int
    borrower_wallet: str
    amount: float
    interest_rate: float
    risk_score: float
    due_date: Optional[datetime] = None
    status: str
    transaction_hash: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── User / Borrower ─────────────────────────────────────────────

class UserResponse(BaseModel):
    user_id: int
    wallet_address: str
    credit_score: float
    wallet_age: float
    transaction_count: int
    repayment_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


# ── Repayment ───────────────────────────────────────────────────

class RepaymentResponse(BaseModel):
    repayment_id: int
    loan_id: int
    amount: float
    tx_hash: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# ── Decision Log ────────────────────────────────────────────────

class DecisionLogResponse(BaseModel):
    log_id: int
    wallet_address: str
    loan_id: Optional[int] = None
    decision: str
    risk_score: float
    interest_rate: float
    reason: Optional[str] = None
    ai_explanation: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


# ── AI Risk Evaluation Result ───────────────────────────────────

class RiskEvaluation(BaseModel):
    """Structured response expected from the AI risk agent."""
    risk_score: float = Field(..., ge=0, le=100)
    decision: str = Field(..., pattern="^(APPROVED|REJECTED)$")
    interest_rate: float = Field(..., ge=0)
    reason: str
    ai_explanation: str


# ── Wallet Analytics ────────────────────────────────────────────

class WalletAnalytics(BaseModel):
    wallet_address: str
    wallet_age: float          # in days
    transaction_count: int
    token_activity: int        # number of ERC-20 transfer events


# ── Generic wrapper ─────────────────────────────────────────────

class PaginatedResponse(BaseModel):
    total: int
    items: List[BaseModel]
