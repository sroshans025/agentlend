"""
AgentLend AI — WDK Wallet Service (Hybrid)
============================================
Provides wallet operations via a **WDK-first** abstraction with a
**Web3.py fallback** for direct ERC-20 transfers on Sepolia.

WDK endpoints are called when WDK_API_KEY is configured.
Otherwise, the service falls back to raw Web3.py + TREASURY_PRIVATE_KEY.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import requests
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Web3 provider (fallback) ────────────────────────────────────

w3 = Web3(Web3.HTTPProvider(settings.SEPOLIA_RPC_URL))
# Sepolia is a PoA network — inject middleware for extra-data handling
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)

# Minimal ERC-20 ABI (transfer + balanceOf)
ERC20_ABI = [
    {
        "constant": False,
        "inputs": [
            {"name": "_to", "type": "address"},
            {"name": "_value", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function",
    },
]


# ══════════════════════════════════════════════════════════════════
#  WDK API helpers
# ══════════════════════════════════════════════════════════════════

def _wdk_headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.WDK_API_KEY}",
        "Content-Type": "application/json",
    }


def _wdk_request(method: str, path: str, **kwargs: Any) -> Optional[Dict]:
    """Generic WDK REST call."""
    url = f"{settings.WDK_BASE_URL}{path}"
    try:
        resp = requests.request(method, url, headers=_wdk_headers(), timeout=30, **kwargs)
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        logger.warning("WDK API unavailable (%s %s): %s", method, path, exc)
        return None


def _wdk_available() -> bool:
    key = (settings.WDK_API_KEY or "").strip()
    if not key:
        return False

    lowered = key.lower()
    placeholder_values = {
        "dummy",
        "your-wdk-api-key",
        "your-wdk-api-key-here",
        "changeme",
        "replace-me",
    }
    return lowered not in placeholder_values


# ══════════════════════════════════════════════════════════════════
#  Public API
# ══════════════════════════════════════════════════════════════════

def create_wallet() -> Optional[Dict[str, str]]:
    """
    Create a new wallet.

    Returns {"address": "0x…", "wallet_id": "…"} or None.
    """
    if _wdk_available():
        result = _wdk_request("POST", "/wallets")
        if result:
            logger.info("WDK wallet created: %s", result.get("address"))
            return result
        return None

    # Fallback: generate a local account (NOT production-safe)
    acct = w3.eth.account.create()
    logger.info("Local wallet created (fallback): %s", acct.address)
    return {"address": acct.address, "private_key": acct.key.hex()}


def get_wallet_balance(wallet_address: Optional[str] = None) -> Dict[str, Any]:
    """
    Return token balance for *wallet_address* (defaults to treasury).

    Returns {"address": "0x…", "balance_raw": int, "balance_human": float}
    """
    address = wallet_address or settings.TREASURY_WALLET_ADDRESS
    checksum = Web3.to_checksum_address(address)

    if _wdk_available():
        result = _wdk_request("GET", f"/wallets/{address}/balance")
        if result:
            return result

    # Fallback: read on-chain ERC-20 balance
    try:
        if settings.TOKEN_CONTRACT_ADDRESS:
            token = w3.eth.contract(
                address=Web3.to_checksum_address(settings.TOKEN_CONTRACT_ADDRESS),
                abi=ERC20_ABI,
            )
            raw_balance: int = token.functions.balanceOf(checksum).call()
        else:
            # No token configured — return native ETH balance
            raw_balance = w3.eth.get_balance(checksum)

        decimals = settings.TOKEN_DECIMALS if settings.TOKEN_CONTRACT_ADDRESS else 18
        human_balance = raw_balance / (10 ** decimals)
        return {
            "address": address,
            "balance_raw": raw_balance,
            "balance_human": round(human_balance, 6),
        }
    except Exception as exc:
        logger.error("Balance fetch failed for %s: %s", address, exc)
        return {"address": address, "balance_raw": 0, "balance_human": 0.0}


def send_transaction(to_address: str, amount: float) -> Optional[str]:
    """
    Send *amount* of ERC-20 tokens from the treasury to *to_address*.

    Returns the transaction hash (hex string) or None on failure.
    """
    to_checksum = Web3.to_checksum_address(to_address)
    treasury_checksum = Web3.to_checksum_address(settings.TREASURY_WALLET_ADDRESS)

    # ── Try WDK first ──────────────────────────────────────────
    if _wdk_available():
        payload = {
            "from": settings.TREASURY_WALLET_ADDRESS,
            "to": to_address,
            "amount": str(amount),
            "token": settings.TOKEN_CONTRACT_ADDRESS or "ETH",
            "chain_id": settings.CHAIN_ID,
        }
        result = _wdk_request("POST", "/transactions/send", json=payload)
        if result and result.get("tx_hash"):
            logger.info("WDK tx sent → %s", result["tx_hash"])
            return result["tx_hash"]
        logger.warning("WDK send failed; falling back to Web3.py")

    # ── Web3.py fallback ────────────────────────────────────────
    if not settings.TREASURY_PRIVATE_KEY:
        logger.error("Cannot send tx — no TREASURY_PRIVATE_KEY configured.")
        return None

    try:
        amount_wei = int(amount * (10 ** settings.TOKEN_DECIMALS))
        nonce = w3.eth.get_transaction_count(treasury_checksum)

        if settings.TOKEN_CONTRACT_ADDRESS:
            # ERC-20 transfer
            token = w3.eth.contract(
                address=Web3.to_checksum_address(settings.TOKEN_CONTRACT_ADDRESS),
                abi=ERC20_ABI,
            )
            tx = token.functions.transfer(to_checksum, amount_wei).build_transaction(
                {
                    "chainId": settings.CHAIN_ID,
                    "from": treasury_checksum,
                    "nonce": nonce,
                    "gas": 100_000,
                    "gasPrice": w3.eth.gas_price,
                }
            )
        else:
            # Native ETH transfer
            tx = {
                "chainId": settings.CHAIN_ID,
                "to": to_checksum,
                "value": amount_wei,
                "nonce": nonce,
                "gas": 21_000,
                "gasPrice": w3.eth.gas_price,
            }

        signed = w3.eth.account.sign_transaction(tx, settings.TREASURY_PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        hex_hash = tx_hash.hex()
        logger.info("Web3 tx sent → %s", hex_hash)
        return hex_hash

    except Exception as exc:
        logger.error("Web3 send_transaction failed: %s", exc)
        return None


def get_transaction_history(wallet_address: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Retrieve recent transactions for *wallet_address* (defaults to treasury).
    Tries WDK first, then falls back to Etherscan via the blockchain scanner.
    """
    address = wallet_address or settings.TREASURY_WALLET_ADDRESS

    if _wdk_available():
        result = _wdk_request("GET", f"/wallets/{address}/transactions")
        if result and isinstance(result, list):
            return result

    # Fallback: use blockchain scanner
    from blockchain.blockchain_scanner import get_normal_transactions
    return get_normal_transactions(address)
