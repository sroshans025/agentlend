"""
AgentLend AI — Admin Routes
=============================
GET /admin/loans          → list all loans
GET /admin/treasury       → treasury wallet balance
GET /admin/users          → list all borrower profiles
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from database.models import User
from database.schemas import LoanResponse, UserResponse
from services.loan_service import get_all_loans
from blockchain.wdk_wallet import get_wallet_balance

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/loans", response_model=List[LoanResponse])
def list_loans(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Return all loans (most recent first)."""
    return get_all_loans(db, skip=skip, limit=limit)


@router.get("/treasury")
def treasury_balance():
    """Return the current treasury wallet balance."""
    return get_wallet_balance()


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """Return all registered borrower profiles."""
    return db.query(User).order_by(User.created_at.desc()).all()
