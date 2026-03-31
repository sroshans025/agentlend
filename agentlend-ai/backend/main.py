"""
AgentLend AI — Main Application Entry Point
==============================================
• FastAPI initialisation
• Database table creation
• Route registration
• Background workers (repayment monitor + autonomous lending agent)
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database.db import init_db

# ── Routes ──────────────────────────────────────────────────────
from routes.loan_routes import router as loan_router
from routes.admin_routes import router as admin_router
from routes.decision_log_routes import router as decision_log_router

# ── Background workers ─────────────────────────────────────────
from blockchain.repayment_monitor import run_repayment_monitor
from services.autonomous_agent import run_autonomous_agent

settings = get_settings()

# ── Logging setup ──────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s │ %(levelname)-8s │ %(name)s │ %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("agentlend")
BASE_DIR = Path(__file__).resolve().parent


# ── Lifespan (startup / shutdown) ──────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Runs on startup:
      1. Create database tables (idempotent)
      2. Launch the autonomous lending agent loop
      3. Launch the repayment monitor loop

    On shutdown the tasks are cancelled automatically.
    """
    logger.info("🚀  AgentLend AI starting up …")
    init_db()
    logger.info("Database tables ensured.")

    # Launch background workers as tasks
    agent_task = asyncio.create_task(run_autonomous_agent())
    monitor_task = asyncio.create_task(run_repayment_monitor())
    logger.info("Background workers launched (agent + repayment monitor).")

    yield  # application is serving requests

    # Shutdown
    logger.info("Shutting down background workers …")
    agent_task.cancel()
    monitor_task.cancel()
    try:
        await agent_task
    except asyncio.CancelledError:
        pass
    try:
        await monitor_task
    except asyncio.CancelledError:
        pass
    logger.info("AgentLend AI shut down cleanly.")


# ── FastAPI app ────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Autonomous AI lending agent — analyses borrower wallets on-chain, "
        "evaluates risk with AWS Bedrock, and manages a treasury wallet on "
        "Ethereum Sepolia."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS (permissive for hackathon; tighten for production) ────

cors_origins = settings.cors_origins_list or ["*"]
allow_credentials = cors_origins != ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────

app.include_router(loan_router)
app.include_router(admin_router)
app.include_router(decision_log_router)


# ── Health-check ───────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": "0.1.0",
    }


@app.get("/", include_in_schema=False)
def root_redirect():
    return RedirectResponse(url="/ui", status_code=307)


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=204)


@app.get("/ui", include_in_schema=False)
def test_ui():
    return FileResponse(BASE_DIR / "static" / "test-ui.html")
