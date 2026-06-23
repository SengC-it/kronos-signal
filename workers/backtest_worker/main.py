import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Backtest Worker")


class BacktestRequest(BaseModel):
    symbol: str
    market_type: str
    timeframe: str
    parameter_set_id: str | None = None
    start: str | None = None
    end: str | None = None


def require_auth(authorization: str | None) -> None:
    api_key = os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "detail": "Backtest worker is available"}


@app.post("/backtest")
def backtest(payload: BacktestRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_auth(authorization)
    return {
        "ok": True,
        "mode": "ordinary",
        "status": "QUEUED",
        "request": payload.model_dump(),
        "required_checks": ["fees", "slippage", "spread", "funding", "stops", "targets", "expiry", "circuit_breakers"],
    }


@app.post("/walk-forward")
def walk_forward(payload: BacktestRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_auth(authorization)
    return {
        "ok": True,
        "mode": "walk_forward",
        "status": "QUEUED",
        "train_days": 90,
        "validation_days": 30,
        "rounds": 6,
        "request": payload.model_dump(),
    }
