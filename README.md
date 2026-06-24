# Kronos V4 Signal Console

AI crypto spot/futures trading signal quality-control system based on Kronos.

This project is a production-oriented Vercel + Supabase control plane with external Python worker services for Kronos inference, market scanning, backtesting, walk-forward validation, lifecycle review, and strategy governance.

It sends structured signal emails only. It does not place orders automatically.

## Architecture

```text
Vercel Next.js App
  Dashboard, APIs, Cron, email dispatch

Supabase
  Auth, Postgres, RLS, signal lifecycle, review, backtest, parameter governance

External Python Workers
  Kronos inference, scanner, backtest, walk-forward, review

Upstash Redis
  Locks, dedupe, task state, circuit breaker cache
```

## Required Services

- Vercel project for the Next.js app.
- Supabase project for Postgres and Auth.
- Docker-capable runtime for Python workers.
- Optional Upstash Redis for production-grade locking.
- Resend or SMTP for signal emails.

## Environment Variables

Copy `.env.example` to `.env.local` for local development.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
WORKER_API_URL=
WORKER_API_KEY=
KRONOS_API_URL=
KRONOS_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
MAIL_FROM=
MAIL_TO=
```

Never expose `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_API_KEY`, `KRONOS_API_KEY`, or SMTP credentials to the browser.

## Supabase Setup

1. Create a Supabase project.
2. Apply `supabase/migrations/001_initial_schema.sql`.
3. Enable email/password or preferred Auth provider.
4. Confirm RLS is enabled on all public tables.
5. Add Supabase environment variables to Vercel.

The migration grants authenticated read access. Writes should be performed by server-side routes and worker services using the service role key.

## Vercel Setup

1. Create a Vercel project from this repository.
2. Add all required environment variables.
3. Deploy production.
4. Verify `/api/health`.
5. Vercel Cron will call:
   - `/api/cron/scan` every 15 minutes.
   - `/api/cron/review` hourly.

Cron endpoints require `Authorization: Bearer ${CRON_SECRET}`.

## Worker Setup

### Render Free Mock Worker

This repository includes `render.yaml` for a free Render web service:

```text
workers.api.main:app
```

It exposes:

```text
GET  /health
POST /health
POST /scan
POST /review
POST /backtest
POST /walk-forward
POST /predict
```

For a temporary mock deployment, set both Vercel and Render to the same Render URL:

```text
WORKER_API_URL=https://your-render-service.onrender.com
KRONOS_API_URL=https://your-render-service.onrender.com
```

Use the same generated secrets in both places:

```text
WORKER_API_KEY=<random secret>
KRONOS_API_KEY=<random secret>
```

Render Free may sleep after inactivity. The GitHub Actions 15-minute scan usually keeps it warm enough for testing, but free services are not suitable for production trading.

Install locally:

```bash
pip install -r workers/requirements.txt
uvicorn workers.kronos_service.main:app --reload --port 8101
uvicorn workers.scanner_worker.main:app --reload --port 8102
uvicorn workers.backtest_worker.main:app --reload --port 8103
uvicorn workers.review_worker.main:app --reload --port 8104
```

Build Docker image:

```bash
docker build -f workers/Dockerfile -t kronos-v4-worker .
```

Run scanner worker:

```bash
docker run --rm -p 8000:8000 --env-file .env.local kronos-v4-worker
```

For real Kronos inference, install the upstream Kronos package and model weights on the worker host, then set the `KRONOS_INFERENCE_MODE=real` variables below.

### Old Windows Server Worker Setup

This repo includes PowerShell scripts for an older Windows server without Docker:

```powershell
Copy-Item .\workers\windows\worker.env.example.ps1 .\workers\windows\worker.env.ps1
notepad .\workers\windows\worker.env.ps1
powershell -ExecutionPolicy Bypass -File .\workers\windows\Start-KronosWorker.ps1 -InstallDependencies
```

In another PowerShell window:

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8000/health
```

Install scheduled worker tasks from an elevated PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Install-ScheduledTasks.ps1
```

The installed tasks start the unified worker API on boot, run `/scan` every 15 minutes, and run `/review` hourly. Vercel should point both `WORKER_API_URL` and `KRONOS_API_URL` at the server URL if the worker is reachable from Vercel.

For public Vercel access, do not expose port `8000` directly. Point a domain such as `worker.example.com` to the Windows server public IP, run Caddy or another HTTPS reverse proxy on `443`, and proxy to `127.0.0.1:8000`. A starter Caddy config is available at `workers/windows/Caddyfile.example`.

If you only have a public IP, `http://PUBLIC_IP:8000` can work as a temporary smoke-test endpoint, but it is not recommended for production because the worker secrets travel without TLS. Do not use a self-signed HTTPS certificate for Vercel calls; Vercel will normally reject untrusted certificates.

For Windows Server 2008 R2, use the compatibility scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Install-ScheduledTasks-2008R2.ps1
```

For a temporary public-IP smoke test only:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Configure-FirewallForPublicWorker-2008R2.ps1 -TemporaryAllowWorkerPort
powershell -ExecutionPolicy Bypass -File .\workers\windows\Start-KronosWorker.ps1 -HostName 0.0.0.0 -Port 8000
```

Then set Vercel to `http://PUBLIC_IP:8000` only long enough to verify `/api/health` and one dry scan.

Windows Server 2008 R2 usually means Python 3.8, so install the compatible dependency set if the default requirements fail:

```powershell
.\.venv\Scripts\python.exe -m pip install -r .\workers\requirements-win2008.txt
```

If startup fails with `_pydantic_core` DLL errors, remove the Pydantic v2 packages and reinstall the 2008 R2 set:

```powershell
.\.venv\Scripts\python.exe -m pip uninstall -y fastapi pydantic pydantic-core uvicorn httpx
.\.venv\Scripts\python.exe -m pip install --force-reinstall -r .\workers\requirements-win2008.txt
```

Open only the HTTPS port from an elevated PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\workers\windows\Configure-FirewallForPublicWorker.ps1 -AllowHttpForCertificate
```

Then configure Vercel:

```text
WORKER_API_URL=https://worker.example.com
KRONOS_API_URL=https://worker.example.com
WORKER_API_KEY=<same value as worker.env.ps1>
KRONOS_API_KEY=<same value as worker.env.ps1>
```

To use OKX instead of Binance for market data, set this on the Windows worker:

```powershell
$env:EXCHANGE = "OKX"
$env:OKX_API_BASE = "https://www.okx.com"
```

The default symbols remain `BTCUSDT`, `ETHUSDT`, etc.; the scanner maps them to OKX instrument IDs such as `BTC-USDT` and `BTC-USDT-SWAP`.

Kronos real inference is controlled by:

```text
KRONOS_INFERENCE_MODE=real
KRONOS_MODEL_PATH=C:\models\Kronos-small
KRONOS_TOKENIZER_PATH=C:\models\Kronos-Tokenizer
KRONOS_MODEL_MODULE=model
KRONOS_DEVICE=cpu
```

Keep `KRONOS_INFERENCE_MODE=mock` for the first deployment smoke test. Switch to `real` only after the upstream Kronos Python package and model weights are installed on the server.

## Development

```bash
npm install
npm run dev
```

Verification:

```bash
npm run typecheck
npm run lint
npm run build
npm run worker:check
```

## Trading Safety

This system is designed for decision support, risk filtering, review, and alerting. It does not submit orders, does not manage exchange positions, and does not guarantee profitability.

Before live use:

- Run historical backtests with realistic fees, slippage, spread, funding, and execution delay.
- Run walk-forward validation.
- Run at least 2 to 4 weeks of simulation.
- Start small, with manual execution only.
- Disable any strategy that fails its PF, drawdown, model drift, or market-regime gates.
