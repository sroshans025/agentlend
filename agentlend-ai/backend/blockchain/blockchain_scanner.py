"""
AgentLend AI — Blockchain Scanner
===================================
Low-level helpers that talk to Ethereum Sepolia via RPC & Etherscan API.
All other services should use the On-Chain Analyzer (higher-level) instead
of calling these functions directly.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

import requests
from web3 import Web3

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Web3 provider ───────────────────────────────────────────────

w3 = Web3(Web3.HTTPProvider(settings.SEPOLIA_RPC_URL))


# ── Etherscan helpers ───────────────────────────────────────────

def _etherscan_get(params: Dict[str, Any]) -> Any:
    """Execute an Etherscan API call with automatic API key injection."""
    params["apikey"] = settings.ETHERSCAN_API_KEY
    try:
        resp = requests.get(settings.ETHERSCAN_BASE_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if data.get("status") == "1":
            return data.get("result", [])
        # Etherscan returns status "0" for empty results (not necessarily errors)
        logger.debug("Etherscan returned status 0: %s", data.get("message"))
        return []
    except requests.RequestException as exc:
        logger.error("Etherscan API error: %s", exc)
        return []


# ── Public functions ─────────────────────────────────────────────

def get_normal_transactions(wallet_address: str) -> List[Dict[str, Any]]:
    """Return normal (ETH) transactions for a wallet via Etherscan."""
    return _etherscan_get(
        {
            "module": "account",
            "action": "txlist",
            "address": wallet_address,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "asc",
        }
    )


def get_erc20_transfers(wallet_address: str) -> List[Dict[str, Any]]:
    """Return ERC-20 token transfer events for a wallet via Etherscan."""
    return _etherscan_get(
        {
            "module": "account",
            "action": "tokentx",
            "address": wallet_address,
            "startblock": 0,
            "endblock": 99999999,
            "sort": "asc",
        }
    )


def get_first_transaction_timestamp(wallet_address: str) -> Optional[int]:
    """Return UNIX timestamp of the wallet's first-ever transaction, or None."""
    txs = get_normal_transactions(wallet_address)
    if txs and isinstance(txs, list) and len(txs) > 0:
        return int(txs[0].get("timeStamp", 0))
    return None


def get_wallet_balance_wei(wallet_address: str) -> int:
    """Get the native ETH balance in wei using Web3."""
    try:
        checksum = Web3.to_checksum_address(wallet_address)
        return w3.eth.get_balance(checksum)
    except Exception as exc:
        logger.error("Failed to fetch balance for %s: %s", wallet_address, exc)
        return 0


def get_current_block() -> int:
    """Return the latest block number."""
    try:
        return w3.eth.block_number
    except Exception as exc:
        logger.error("Failed to fetch current block: %s", exc)
        return 0


def get_incoming_token_transfers(
    wallet_address: str, from_block: int = 0
) -> List[Dict[str, Any]]:
    """Return ERC-20 transfers *to* the given wallet (useful for repayments)."""
    all_transfers = get_erc20_transfers(wallet_address)
    if not isinstance(all_transfers, list):
        return []
    return [
        tx
        for tx in all_transfers
        if tx.get("to", "").lower() == wallet_address.lower()
        and int(tx.get("blockNumber", 0)) >= from_block
    ]
