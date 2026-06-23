import os
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Scanner Worker")


class ScanRequest(BaseModel):
    symbols: list[str] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
    timeframes: list[str] = ["15m", "1h", "4h"]
    market_types: list[str] = ["SPOT", "FUTURES"]
    limit: int = 400


def require_auth(authorization: str | None) -> None:
    api_key = os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


async def fetch_klines(symbol: str, interval: str, market_type: str, limit: int) -> list[dict[str, Any]]:
    base = os.getenv("BINANCE_FAPI_BASE" if market_type == "FUTURES" else "BINANCE_API_BASE")
    if not base:
        base = "https://fapi.binance.com" if market_type == "FUTURES" else "https://api.binance.com"
    path = "/fapi/v1/klines" if market_type == "FUTURES" else "/api/v3/klines"
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(f"{base}{path}", params={"symbol": symbol, "interval": interval, "limit": limit})
        response.raise_for_status()
        rows = response.json()
    return [
        {
            "timestamp": str(row[0]),
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": float(row[5]),
            "is_closed": True,
        }
        for row in rows
    ]


@app.post("/health")
def health() -> dict[str, Any]:
    return {"ok": True, "detail": "Scanner worker is available"}


@app.post("/scan")
async def scan(payload: ScanRequest, authorization: str | None = Header(default=None)) -> dict[str, Any]:
    require_auth(authorization)
    kronos_url = os.getenv("KRONOS_API_URL")
    kronos_key = os.getenv("KRONOS_API_KEY") or os.getenv("WORKER_API_KEY", "")
    processed = []

    for market_type in payload.market_types:
        for symbol in payload.symbols:
            for timeframe in payload.timeframes:
                candles = await fetch_klines(symbol, timeframe, market_type, payload.limit)
                prediction = None
                if kronos_url:
                    async with httpx.AsyncClient(timeout=30) as client:
                        response = await client.post(
                            f"{kronos_url.rstrip('/')}/predict",
                            headers={"authorization": f"Bearer {kronos_key}"},
                            json={
                                "symbol": symbol,
                                "market_type": market_type,
                                "timeframe": timeframe,
                                "candles": candles,
                                "pred_len": 16 if timeframe == "15m" else 12 if timeframe == "1h" else 6,
                                "sample_count": 5,
                            },
                        )
                        response.raise_for_status()
                        prediction = response.json()

                processed.append(
                    {
                        "symbol": symbol,
                        "market_type": market_type,
                        "timeframe": timeframe,
                        "candles": len(candles),
                        "prediction": prediction,
                    }
                )

    return {"ok": True, "processed": processed, "note": "Persistence is enabled after Supabase worker credentials are configured"}
