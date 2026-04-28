# 🤖 AgentLend AI 
### Autonomous AI Lending Agent | Built for Hackathon Galactica (WDK Edition)

AgentLend AI is a decentralized, autonomous lending ecosystem that merges **Artificial Intelligence** with **On-Chain Telemetry**. It evaluates borrower risk in real-time and executes USDT loans on the Ethereum Sepolia Testnet—all without human intervention.

![Web3](https://img.shields.io/badge/Web3-Ethereum_Sepolia-627EEA?style=for-the-badge&logo=ethereum&logoColor=white)
![AI Engine](https://img.shields.io/badge/AI_Engine-AWS_Bedrock-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white)
![Tether WDK](https://img.shields.io/badge/Blockchain-Tether_WDK-009393?style=for-the-badge&logo=tether&logoColor=white)
![Vercel Ready](https://img.shields.io/badge/Vercel-Deployed-black?style=for-the-badge&logo=vercel&logoColor=white)

---

## 📖 Overview

Traditional lending is hampered by manual overhead and centralized bias. **AgentLend AI** solves this by using an **AWS Bedrock-powered** risk engine to analyze wallet history and the **Tether WDK** for programmatic, secure disbursements.

### ✨ Key Features
* **Autonomous Risk Assessment:** Real-time analysis of wallet age, transaction density, and liquidity patterns directly from the blockchain.
* **WDK-Powered Execution:** Secure, automated USDT disbursements via the EVM module of the **Wallet Development Kit (WDK)**.
* **Explainable AI (XAI):** Every approval or rejection is logged with clear, AI-generated reasoning for total transparency.
* **Auto-Repayment Tracking:** Background workers monitor the Sepolia Testnet to update loan statuses and credit scores instantly.

---

## 🏗️ Architecture

The system is built on a modular 4-layer stack:
1.  **Agent Layer:** Python-based AI microservices (`risk_agent.py`, `credit_score.py`) using **AWS Bedrock**.
2.  **Backend Layer:** FastAPI orchestrator managing the database (SQLAlchemy) and autonomous background loops.
3.  **Blockchain Layer:** Integration with **Tether WDK** and Etherscan API for EVM-native transactions.
4.  **Dashboard Layer:** A React/Next.js frontend providing a transparent interface for borrowers and auditors.

<div align="center">
  <img src="https://github.com/user-attachments/assets/a916a041-3c3e-4733-b67b-6b4c4d905f67" alt="AgentLend Workflow" width="800"/>
</div>

---

## 🛠️ Tech Stack

* **AI/LLM:** AWS Bedrock (Explainable Risk Modeling)
* **Blockchain:** Ethereum Sepolia Testnet, Tether WDK, Web3.py
* **Backend:** Python (FastAPI), Pydantic, SQLAlchemy
* **Frontend:** React / Next.js, Tailwind CSS
* **Data:** Etherscan Data API

---

## 🔄 Workflow

1.  **Request:** User connects their Web3 wallet and requests a loan amount.
2.  **Analyze:** The `onchain_analyzer` fetches historical metadata (transaction count, age, activity).
3.  **Evaluate:** The AI calculates a **Risk Score** and assigns a dynamic interest rate based on telemetric trust.
4.  **Disburse:** Approved loans are sent instantly in **USDT** using the WDK EVM module.
5.  **Monitor:** The system tracks repayments on-chain; failure to repay triggers an automated default penalty on the user's decentralized credit profile.

---

## 📸 Platform Dashboard

<div align="center">
  <img src="https://github.com/user-attachments/assets/06e2c020-33b2-4749-93f8-e5b3191cecbe" alt="AgentLend Platform Screenshot" width="800"/>
</div>

---

## 🚀 How to Deploy on Vercel

The frontend dashboard is built with Next.js and is fully optimized for Vercel deployment:

1. Push your code to a GitHub repository.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New > Project**.
3. Import your AgentLend AI repository.
4. Add your Environment Variables (e.g., `NEXT_PUBLIC_ALCHEMY_API_KEY`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `PRIVATE_KEY`).
5. Click **Deploy**. Your decentralized autonomous AI lending agent will be live!
