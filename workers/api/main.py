from typing import Any

from fastapi import FastAPI, Header

from workers.backtest_worker.main import BacktestRequest, backtest, walk_forward
from workers.kronos_service.main import PredictRequest, predict
from workers.review_worker.main import ReviewRequest, review
from workers.scanner_worker.main import ScanRequest, scan

app = FastAPI(title="Kronos V4 Unified Worker")


@app.get("/health")
def health_get() -> dict[str, Any]:
    return {
        "ok": True,
        "detail": "Unified worker is available",
        "services": ["scan", "review", "backtest", "walk_forward", "mock_predict"],
    }


@app.post("/health")
def health_post() -> dict[str, Any]:
    return health_get()


@app.post("/scan")
async def scan_endpoint(payload: ScanRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return await scan(payload, authorization)


@app.post("/review")
def review_endpoint(payload: ReviewRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return review(payload, authorization)


@app.post("/backtest")
def backtest_endpoint(payload: BacktestRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return backtest(payload, authorization)


@app.post("/walk-forward")
def walk_forward_endpoint(payload: BacktestRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return walk_forward(payload, authorization)


@app.post("/predict")
def predict_endpoint(payload: PredictRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    return predict(payload, authorization)
