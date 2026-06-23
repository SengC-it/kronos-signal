import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Review Worker")


class ReviewRequest(BaseModel):
    window_hours: int = 48


def require_auth(authorization: str | None) -> None:
    api_key = os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "detail": "Review worker is available"}


@app.post("/review")
def review(payload: ReviewRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_auth(authorization)
    return {
        "ok": True,
        "status": "QUEUED",
        "window_hours": payload.window_hours,
        "tasks": ["lifecycle_update", "mfe_mae", "performance_stats", "strategy_retirement_checks"],
    }
