# AgentLend AI Frontend Dashboard

Modern fintech dashboard page for **AgentLend AI** built with **React + TailwindCSS + Recharts + Framer Motion**.

## Features

- Left sidebar navigation
- Top header with Ethereum network, connected wallet, treasury balance, and AI agent status
- 6 neon metric cards with animated counters and icons
- 3 analytics charts:
  - Loan Distribution (Line)
  - Risk Score Distribution (Bar)
  - Repayment History (Bar)
- Responsive dark SaaS/Web3 design with glassmorphism and glow effects

## Run locally

```bash
cd /home/ravi/LendingAgent/agentlend-ai/frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Connect to backend

- Frontend reads API URL from `VITE_API_BASE_URL`.
- Default value in `.env.example` is `http://localhost:8000`.
- Ensure backend runs before using data-driven tabs.

### Start backend

```bash
cd /home/ravi/LendingAgent/agentlend-ai/backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Start frontend

```bash
cd /home/ravi/LendingAgent/agentlend-ai/frontend
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
