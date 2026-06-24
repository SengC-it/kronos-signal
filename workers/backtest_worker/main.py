import os
from typing import Any, Dict, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Backtest Worker")


class BacktestRequest(BaseModel):
    symbol: str
    market_type: str
    timeframe: str
    parameter_set_id: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None


def model_to_dict(model: BaseModel) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def require_auth(authorization: Optional[str]) -> None:
    api_key = os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "detail": "Backtest worker is available"}


@app.post("/backtest")
def backtest(payload: BacktestRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    require_auth(authorization)
    return {
        "ok": True,
        "mode": "ordinary",
        "status": "QUEUED",
        "request": model_to_dict(payload),
        "required_checks": ["fees", "slippage", "spread", "funding", "stops", "targets", "expiry", "circuit_breakers"],
    }


@app.post("/walk-forward")
def walk_forward(payload: BacktestRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    require_auth(authorization)
    return {
        "ok": True,
        "mode": "walk_forward",
        "status": "QUEUED",
        "train_days": 90,
        "validation_days": 30,
        "rounds": 6,
        "request": model_to_dict(payload),
    }
