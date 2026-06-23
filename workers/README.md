# Kronos V4 Worker Services

These services run outside Vercel because Kronos inference, scan loops, and backtests are not suitable for Vercel Serverless limits.

## Services

- `workers.kronos_service.main:app`: Kronos prediction contract with mock fallback.
- `workers.scanner_worker.main:app`: Binance scan and signal generation contract.
- `workers.backtest_worker.main:app`: ordinary and walk-forward backtest contract.
- `workers.review_worker.main:app`: lifecycle review and performance refresh contract.

## Run Locally

```bash
pip install -r workers/requirements.txt
uvicorn workers.kronos_service.main:app --reload --port 8101
uvicorn workers.scanner_worker.main:app --reload --port 8102
uvicorn workers.backtest_worker.main:app --reload --port 8103
uvicorn workers.review_worker.main:app --reload --port 8104
```

## Required Environment

```text
WORKER_API_KEY=
KRONOS_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
KRONOS_API_URL=
BINANCE_API_BASE=https://api.binance.com
BINANCE_FAPI_BASE=https://fapi.binance.com
```

The Vercel app calls worker endpoints with `Authorization: Bearer ${WORKER_API_KEY}`.
