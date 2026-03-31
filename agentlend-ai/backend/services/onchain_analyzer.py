"""
AgentLend AI — On-Chain Wallet Analyzer
========================================
Higher-level service that combines blockchain scanner data into a
structured WalletAnalytics object consumed by the credit score & AI agent.
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from database.schemas import WalletAnalytics
from blockchain.blockchain_scanner import (
    get_normal_transactions,
    get_erc20_transfers,
    get_first_transaction_timestamp,
)

logger = logging.getLogger(__name__)


def analyze_wallet(wallet_address: str) -> WalletAnalytics:
    """
    Fetch on-chain data for *wallet_address* on Sepolia and return
    structured analytics.

    Returns
    -------
    WalletAnalytics
        wallet_address, wallet_age (days), transaction_count, token_activity
    """
    wallet_address = wallet_address.strip().lower()
    logger.info("Analyzing wallet %s …", wallet_address)

    # ── Wallet age ──────────────────────────────────────────────
    first_ts: Optional[int] = get_first_transaction_timestamp(wallet_address)
    if first_ts and first_ts > 0:
        wallet_age_days = (time.time() - first_ts) / 86_400  # seconds → days
    else:
        wallet_age_days = 0.0

    # ── Transaction count (normal txs) ──────────────────────────
    normal_txs = get_normal_transactions(wallet_address)
    tx_count = len(normal_txs) if isinstance(normal_txs, list) else 0

    # ── Token activity (ERC-20 transfer events) ────────────────
    token_txs = get_erc20_transfers(wallet_address)
    token_activity = len(token_txs) if isinstance(token_txs, list) else 0

    analytics = WalletAnalytics(
        wallet_address=wallet_address,
        wallet_age=round(wallet_age_days, 2),
        transaction_count=tx_count,
        token_activity=token_activity,
    )

    logger.info(
        "Wallet analytics for %s → age=%.1f days, txs=%d, tokens=%d",
        wallet_address,
        analytics.wallet_age,
        analytics.transaction_count,
        analytics.token_activity,
    )
    return analytics
