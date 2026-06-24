import os
import statistics
from importlib import import_module
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Prediction Service")

_MODEL_RUNTIME: Optional[Dict[str, Any]] = None


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
    candles: List[Candle]


def model_to_dict(model: BaseModel) -> Dict[str, Any]:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def require_auth(authorization: Optional[str]) -> None:
    api_key = os.getenv("KRONOS_API_KEY") or os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def inference_mode() -> str:
    return os.getenv("KRONOS_INFERENCE_MODE", "mock").strip().lower()


def get_model_runtime() -> Dict[str, Any]:
    global _MODEL_RUNTIME
    if _MODEL_RUNTIME is not None:
        return _MODEL_RUNTIME

    if inference_mode() != "real":
        _MODEL_RUNTIME = {"mode": "mock"}
        return _MODEL_RUNTIME

    model_path = os.getenv("KRONOS_MODEL_PATH")
    tokenizer_path = os.getenv("KRONOS_TOKENIZER_PATH")
    if not model_path or not tokenizer_path:
        raise RuntimeError("KRONOS_MODEL_PATH and KRONOS_TOKENIZER_PATH are required when KRONOS_INFERENCE_MODE=real")

    # The upstream Kronos package is installed on the worker host. Lazy imports
    # keep mock deployments free of Torch/model-weight requirements.
    try:
        import torch  # type: ignore

        model_module = import_module(os.getenv("KRONOS_MODEL_MODULE", "model"))
        Kronos = getattr(model_module, "Kronos")
        KronosPredictor = getattr(model_module, "KronosPredictor")
        KronosTokenizer = getattr(model_module, "KronosTokenizer")
    except Exception as exc:  # pragma: no cover - depends on external model package
        raise RuntimeError(f"Kronos runtime import failed: {exc}") from exc

    device = os.getenv("KRONOS_DEVICE", "cuda" if torch.cuda.is_available() else "cpu")
    max_context = int(os.getenv("KRONOS_MAX_CONTEXT", "512"))
    model = Kronos.from_pretrained(model_path).to(device).eval()
    tokenizer = KronosTokenizer.from_pretrained(tokenizer_path)
    predictor = KronosPredictor(model=model, tokenizer=tokenizer, device=device, max_context=max_context)

    _MODEL_RUNTIME = {
        "mode": "real",
        "device": device,
        "model_path": model_path,
        "tokenizer_path": tokenizer_path,
        "predictor": predictor,
    }
    return _MODEL_RUNTIME


@app.get("/health")
def health() -> Dict[str, Any]:
    mode = inference_mode()
    if mode != "real":
        return {"ok": True, "detail": "Kronos service is available", "mode": "mock-contract"}

    try:
        runtime = get_model_runtime()
        return {
            "ok": True,
            "detail": "Kronos real inference runtime is loaded",
            "mode": runtime["mode"],
            "device": runtime["device"],
            "model_path": runtime["model_path"],
        }
    except RuntimeError as exc:
        return {"ok": False, "detail": str(exc), "mode": "real"}


def mock_predict(payload: PredictRequest) -> Dict[str, Any]:
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


def real_predict(payload: PredictRequest) -> Dict[str, Any]:
    runtime = get_model_runtime()
    predictor = runtime["predictor"]
    candles = [model_to_dict(candle) for candle in payload.candles[-payload.lookback :]]

    try:
        result = predictor.predict(
            candles=candles,
            pred_len=payload.pred_len,
            sample_count=payload.sample_count,
        )
    except TypeError:
        result = predictor.predict(candles, payload.pred_len, payload.sample_count)

    if not isinstance(result, dict):
        raise RuntimeError("Kronos predictor returned a non-dict response")

    current = payload.candles[-1].close
    pred_close = float(result.get("pred_close_end", result.get("close", current)))
    pred_high = float(result.get("pred_high_max", max(current, pred_close)))
    pred_low = float(result.get("pred_low_min", min(current, pred_close)))
    pred_return = (pred_close / current) - 1

    return {
        "model_name": payload.model_name,
        "model_version": os.getenv("KRONOS_MODEL_VERSION", "real-runtime"),
        "tokenizer_version": os.getenv("KRONOS_TOKENIZER_VERSION", "real-runtime"),
        "prediction_config_version": "v4-default",
        "strategy_version": "v4.0",
        "current_price": current,
        "pred_close_end": pred_close,
        "pred_high_max": pred_high,
        "pred_low_min": pred_low,
        "pred_return": pred_return,
        "pred_upside": (pred_high / current) - 1,
        "pred_downside": (pred_low / current) - 1,
        "pred_volatility": float(result.get("pred_volatility", 0)),
        "path_consistency_long": float(result.get("path_consistency_long", 0.5)),
        "path_consistency_short": float(result.get("path_consistency_short", 0.5)),
        "ai_score_long": float(result.get("ai_score_long", 50)),
        "ai_score_short": float(result.get("ai_score_short", 50)),
        "raw_prediction_json": result,
    }


@app.post("/predict")
def predict(payload: PredictRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    require_auth(authorization)
    if len(payload.candles) < 30:
        raise HTTPException(status_code=400, detail="At least 30 candles are required")

    if inference_mode() != "real":
        return mock_predict(payload)

    try:
        return real_predict(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
