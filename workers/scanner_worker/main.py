import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Kronos V4 Scanner Worker")


class ScanRequest(BaseModel):
    symbols: List[str] = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
    timeframes: List[str] = ["15m", "1h", "4h"]
    market_types: List[str] = ["SPOT", "FUTURES"]
    limit: int = 400


def require_auth(authorization: Optional[str]) -> None:
    api_key = os.getenv("WORKER_API_KEY")
    if api_key and authorization != f"Bearer {api_key}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def exchange_name() -> str:
    return os.getenv("EXCHANGE", "BINANCE").strip().upper()


def okx_inst_id(symbol: str, market_type: str) -> str:
    if "-" in symbol:
        base_symbol = symbol
    elif symbol.endswith("USDT"):
        base_symbol = f"{symbol[:-4]}-USDT"
    else:
        base_symbol = symbol

    if market_type == "FUTURES" and not base_symbol.endswith("-SWAP"):
        return f"{base_symbol}-SWAP"
    return base_symbol


def okx_bar(interval: str) -> str:
    return {"1h": "1H", "4h": "4H"}.get(interval, interval)


async def fetch_binance_klines(symbol: str, interval: str, market_type: str, limit: int) -> List[Dict[str, Any]]:
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


async def fetch_okx_klines(symbol: str, interval: str, market_type: str, limit: int) -> List[Dict[str, Any]]:
    base = os.getenv("OKX_API_BASE", "https://www.okx.com")
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{base.rstrip('/')}/api/v5/market/candles",
            params={
                "instId": okx_inst_id(symbol, market_type),
                "bar": okx_bar(interval),
                "limit": min(limit, 300),
            },
        )
        response.raise_for_status()
        payload = response.json()

    if payload.get("code") != "0":
        raise HTTPException(status_code=502, detail=f"OKX candles failed: {payload}")

    rows = sorted(payload.get("data", []), key=lambda row: int(row[0]))
    return [
        {
            "timestamp": str(row[0]),
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": float(row[5]),
            "is_closed": row[8] == "1" if len(row) > 8 else True,
        }
        for row in rows
    ]


async def fetch_klines(symbol: str, interval: str, market_type: str, limit: int) -> List[Dict[str, Any]]:
    if exchange_name() == "OKX":
        return await fetch_okx_klines(symbol, interval, market_type, limit)
    return await fetch_binance_klines(symbol, interval, market_type, limit)


@app.post("/health")
def health() -> Dict[str, Any]:
    return {"ok": True, "detail": "Scanner worker is available", "exchange": exchange_name()}


@app.post("/scan")
async def scan(payload: ScanRequest, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
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
