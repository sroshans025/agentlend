"""
AgentLend AI — Decision Log Routes
=====================================
GET /decision-logs          → all AI decision logs
GET /decision-logs/{wallet} → decision logs for a specific wallet
"""

from __future__ import annotations

import logging
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database.db import get_db
from database.schemas import DecisionLogResponse
from services.decision_logger import get_all_decision_logs, get_decision_logs_for_wallet

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/decision-logs", tags=["Decision Logs"])


@router.get("/", response_model=List[DecisionLogResponse])
def list_decision_logs(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Return AI decision history (most recent first)."""
    return get_all_decision_logs(db, skip=skip, limit=limit)


@router.get("/{wallet_address}", response_model=List[DecisionLogResponse])
def decision_logs_for_wallet(wallet_address: str, db: Session = Depends(get_db)):
    """Return all AI decision logs for a specific borrower wallet."""
    return get_decision_logs_for_wallet(db, wallet_address)
