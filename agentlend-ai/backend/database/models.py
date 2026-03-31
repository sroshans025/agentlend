"""
AgentLend AI — SQLAlchemy ORM Models
=====================================
"""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Enum,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship

from database.db import Base


# ── Enums ────────────────────────────────────────────────────────

class LoanStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REPAID = "REPAID"
    DEFAULTED = "DEFAULTED"


# ── Helper ───────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Users ────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_address = Column(String(42), unique=True, nullable=False, index=True)
    credit_score = Column(Float, default=0.0)
    wallet_age = Column(Float, default=0.0)           # in days
    transaction_count = Column(Integer, default=0)
    repayment_rate = Column(Float, default=0.0)        # 0.0 – 1.0
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    loans = relationship("Loan", back_populates="borrower", lazy="selectin")


# ── Loans ────────────────────────────────────────────────────────

class Loan(Base):
    __tablename__ = "loans"

    loan_id = Column(Integer, primary_key=True, autoincrement=True)
    borrower_wallet = Column(
        String(42),
        ForeignKey("users.wallet_address"),
        nullable=False,
        index=True,
    )
    amount = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False, default=0.0)
    risk_score = Column(Float, default=0.0)
    due_date = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(LoanStatus), default=LoanStatus.PENDING, nullable=False)
    transaction_hash = Column(String(66), nullable=True)   # 0x + 64 hex chars
    created_at = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    borrower = relationship("User", back_populates="loans")
    repayments = relationship("Repayment", back_populates="loan", lazy="selectin")
    decision_logs = relationship("DecisionLog", back_populates="loan", lazy="selectin")


# ── Repayments ───────────────────────────────────────────────────

class Repayment(Base):
    __tablename__ = "repayments"

    repayment_id = Column(Integer, primary_key=True, autoincrement=True)
    loan_id = Column(Integer, ForeignKey("loans.loan_id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    tx_hash = Column(String(66), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    loan = relationship("Loan", back_populates="repayments")


# ── Decision Logs ────────────────────────────────────────────────

class DecisionLog(Base):
    __tablename__ = "decision_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_address = Column(String(42), nullable=False, index=True)
    loan_id = Column(Integer, ForeignKey("loans.loan_id"), nullable=True)
    decision = Column(String(20), nullable=False)          # APPROVED / REJECTED
    risk_score = Column(Float, default=0.0)
    interest_rate = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    ai_explanation = Column(Text, nullable=True)            # Full AI model reasoning
    timestamp = Column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    loan = relationship("Loan", back_populates="decision_logs")
