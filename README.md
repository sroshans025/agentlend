# AgentLend AI 
### Autonomous AI Lending Agent | Built for Hackathon Galactica (WDK Edition)

AgentLend AI is a decentralized, autonomous lending ecosystem that merges **Artificial Intelligence** with **On-Chain Telemetry**. It evaluates borrower risk in real-time and executes USDT loans on the Ethereum Sepolia Testnet—all without human intervention.
Website: https://agentlend.vercel.app/


## Overview

Traditional lending is hampered by manual overhead and centralized bias. **AgentLend AI** solves this by using a **Google Gemini-powered** risk engine to analyze wallet history and the **Tether WDK** for programmatic, secure disbursements.

### Key Features
* **Autonomous Risk Assessment:** Real-time analysis of wallet age, transaction density, and liquidity patterns.
* **WDK-Powered Execution:** Secure, automated USDT disbursements via the **Wallet Development Kit (WDK)**.
* **Explainable AI (XAI):** Every approval or rejection is logged with clear, AI-generated reasoning for transparency.
* **Auto-Repayment Tracking:** Background workers monitor the Sepolia Testnet to update loan statuses and credit scores instantly.

---

## Architecture

The system is built on a modular 4-layer stack:
1.  **Agent Layer:** Python-based AI microservices (`risk_agent.py`, `credit_score.py`) using Google Gemini API.
2.  **Backend Layer:** FastAPI orchestrator managing the database (SQLAlchemy) and autonomous background loops.
3.  **Blockchain Layer:** Integration with **Tether WDK** and Etherscan API for EVM-native transactions.
4.  **Dashboard Layer:** A React/Next.js frontend providing a transparent interface for borrowers and auditors.

![agentlendworkflow](https://github.com/user-attachments/assets/a916a041-3c3e-4733-b67b-6b4c4d905f67)

---

## Tech Stack

* **AI/LLM:** Google Gemini API (Explainable Risk Modeling)
* **Blockchain:** Ethereum Sepolia Testnet, Tether WDK, Web3.py
* **Backend:** Python (FastAPI), Pydantic, SQLAlchemy
* **Frontend:** React / Next.js, Tailwind CSS
* **Data:** Etherscan Data API

---

## Workflow

1.  **Request:** User connects their wallet and requests a loan amount.
2.  **Analyze:** The `onchain_analyzer` fetches historical metadata (transaction count, age, activity).
3.  **Evaluate:** The AI calculates a **Risk Score** and assigns a dynamic interest rate.
4.  **Disburse:** Approved loans are sent instantly in **USDT** using the WDK EVM module.
5.  **Monitor:** The system tracks repayments; failure to repay triggers an automated default penalty on the user's credit profile.

---

## Screenshot

<img width="1912" height="979" alt="Screenshot 2026-03-31 223721" src="https://github.com/user-attachments/assets/06e2c020-33b2-4749-93f8-e5b3191cecbe" />

