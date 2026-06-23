import os
import statistics
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Prediction Service")


class Candle(BaseModel):
    timestamp: str
    open: float
    high: float
    low: float
    close: float
    volume: float = 0


class PredictRequest(BaseModel):
    symbol: str
    market_type: str
    timeframe: str
    lookback: int = 400
    pred_len: int = 12
    sample_count: int = 5
    model_name: str = "Kronos-small"
    candles: list[Candle]


def require_auth(authorization: str | None) -> None:
    api_key = os.getenv("KRONOS_API_KEY") or os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "detail": "Kronos service is available", "mode": "mock-contract"}


@app.post("/predict")
def predict(payload: PredictRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_auth(authorization)
    if len(payload.candles) < 30:
        raise HTTPException(status_code=400, detail="At least 30 candles are required")

    closes = [candle.close for candle in payload.candles[-payload.lookback :]]
    current = closes[-1]
    returns = [(closes[index] / closes[index - 1]) - 1 for index in range(1, len(closes))]
    momentum = statistics.mean(returns[-12:]) if len(returns) >= 12 else statistics.mean(returns)
    volatility = statistics.pstdev(returns[-30:]) if len(returns) >= 30 else statistics.pstdev(returns)
    projected_return = max(min(momentum * payload.pred_len, 0.08), -0.08)
    pred_close = current * (1 + projected_return)
    pred_high = max(current, pred_close) * (1 + volatility * 3)
    pred_low = min(current, pred_close) * (1 - volatility * 3)
    consistency_long = 0.82 if projected_return > 0 else 0.38
    consistency_short = 0.82 if projected_return < 0 else 0.38

    return {
        "model_name": payload.model_name,
        "model_version": "mock-contract-v1",
        "tokenizer_version": "mock",
        "prediction_config_version": "v4-default",
        "strategy_version": "v4.0",
        "current_price": current,
        "pred_close_end": pred_close,
        "pred_high_max": pred_high,
        "pred_low_min": pred_low,
        "pred_return": projected_return,
        "pred_upside": (pred_high / current) - 1,
        "pred_downside": (pred_low / current) - 1,
        "pred_volatility": volatility,
        "path_consistency_long": consistency_long,
        "path_consistency_short": consistency_short,
        "ai_score_long": 88 if projected_return > 0 else 42,
        "ai_score_short": 88 if projected_return < 0 else 42,
        "raw_prediction_json": {"mode": "mock", "sample_count": payload.sample_count},
    }
