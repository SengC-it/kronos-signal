import os
from typing import Any, Dict, Optional

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Review Worker")


class ReviewRequest(BaseModel):
    window_hours: int = 48


def require_auth(authorization: Optional[str]) -> None:
    api_key = os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.post("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "detail": "Review worker is available"}


@app.post("/review")
def review(payload: ReviewRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    require_auth(authorization)
    return {
        "ok": True,
        "status": "QUEUED",
        "window_hours": payload.window_hours,
        "tasks": ["lifecycle_update", "mfe_mae", "performance_stats", "strategy_retirement_checks"],
    }
