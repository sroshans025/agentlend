"""
AgentLend AI — AWS Bedrock Risk Agent
======================================
Uses AWS Bedrock to evaluate borrower risk and return a structured
lending decision (approve/reject + explanation).
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from config import get_settings
from database.schemas import RiskEvaluation

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Configure AWS Bedrock client ──────────────────────────────────

MODEL_ID = settings.AWS_BEDROCK_MODEL_ID or "amazon.nova-lite-v1:0"

_BEDROCK = boto3.client(
    "bedrock-runtime",
    region_name=settings.AWS_REGION,
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
)

# ── System prompt ───────────────────────────────────────────────

SYSTEM_PROMPT = """
You are an autonomous AI lending risk analyst for AgentLend AI.

Your job is to evaluate a borrower's on-chain data and decide whether to
approve or reject a loan request.

You MUST return your response as a valid JSON object with exactly these keys:

{
  "risk_score": <float 0-100, lower is safer>,
  "decision": "<APPROVED or REJECTED>",
  "interest_rate": <float, annualized percentage>,
  "reason": "<short summary>",
  "ai_explanation": "<2-4 sentence explanation>"
}

Decision guidelines:
- risk_score <= 40 → likely APPROVED with low interest (3–8%)
- risk_score 41–65 → borderline
- risk_score > 65 → likely REJECTED

Important evaluation factors (priority order):
1. Repayment rate
2. Credit score
3. Wallet age
4. Transaction count
5. Loan amount relative to history
6. Loan duration

Return ONLY the JSON object.
"""


def _build_bedrock_payload(prompt: str) -> Dict[str, Any]:
    return {
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "text": prompt,
                    }
                ],
            }
        ],
        "inferenceConfig": {
            "temperature": 0.2,
            "max_new_tokens": 400,
        },
    }


def _extract_bedrock_text(response_body: Dict[str, Any]) -> str:
    output = response_body.get("output", {})
    message = output.get("message", {})
    content = message.get("content", [])
    for item in content:
        text = item.get("text")
        if text:
            return text.strip()
    return ""


# ── Public API ──────────────────────────────────────────────────

def evaluate_risk(
    wallet_age: float,
    transaction_count: int,
    repayment_rate: float,
    loan_amount: float,
    loan_duration: int,
    credit_score: float,
) -> RiskEvaluation:
    """Call AWS Bedrock to evaluate borrower risk."""

    prompt = f"""
{SYSTEM_PROMPT}

Borrower data:

Wallet age: {wallet_age:.1f} days
Transaction count: {transaction_count}
Repayment rate: {repayment_rate:.2%}
Loan amount: {loan_amount} USDT
Loan duration: {loan_duration} days
Credit score: {credit_score:.1f}

Return the decision as JSON.
"""

    logger.info(
        "Sending risk evaluation request to AWS Bedrock model=%s (loan=%.2f)",
        MODEL_ID,
        loan_amount,
    )

    try:
        response = _BEDROCK.invoke_model(
            modelId=MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(_build_bedrock_payload(prompt)),
        )

        body_stream = response.get("body")
        decoded = body_stream.read().decode("utf-8") if body_stream else "{}"
        parsed_body: Dict[str, Any] = json.loads(decoded)
        raw_text = _extract_bedrock_text(parsed_body)

        logger.debug("Bedrock raw response: %s", raw_text)

        # Remove markdown code fences if present
        if raw_text.startswith("```"):
            raw_text = raw_text.split("\n", 1)[-1]
            raw_text = raw_text.rsplit("```", 1)[0]
            raw_text = raw_text.strip()

        result = json.loads(raw_text)
        if not isinstance(result, dict):
            raise ValueError("Bedrock response JSON is not an object")

        risk_score = float(result.get("risk_score", 100.0) or 100.0)
        decision = str(result.get("decision", "REJECTED") or "REJECTED").upper()
        interest_rate_raw = result.get("interest_rate", 0.0)
        interest_rate = float(interest_rate_raw or 0.0)
        reason = str(result.get("reason", "No reason provided by model.") or "No reason provided by model.")
        ai_explanation = str(
            result.get("ai_explanation", "No explanation provided by model.")
            or "No explanation provided by model."
        )

        evaluation = RiskEvaluation(
            risk_score=risk_score,
            decision=decision,
            interest_rate=interest_rate,
            reason=reason,
            ai_explanation=ai_explanation,
        )

        logger.info(
            "Bedrock decision → %s | risk=%.1f | rate=%.2f%%",
            evaluation.decision,
            evaluation.risk_score,
            evaluation.interest_rate,
        )

        return evaluation

    except json.JSONDecodeError as exc:
        logger.error("Failed to parse Bedrock JSON response: %s", exc)

        return RiskEvaluation(
            risk_score=100.0,
            decision="REJECTED",
            interest_rate=0.0,
            reason="AI evaluation failed — invalid JSON from AWS model.",
            ai_explanation=f"Parsing error: {exc}",
        )

    except (ClientError, BotoCoreError, Exception) as exc:
        logger.error("AWS Bedrock API call failed: %s", exc)

        return RiskEvaluation(
            risk_score=100.0,
            decision="REJECTED",
            interest_rate=0.0,
            reason="AI evaluation failed — AWS Bedrock API error.",
            ai_explanation=f"API error: {exc}",
        )