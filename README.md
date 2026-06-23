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

For real Kronos inference, replace the mock contract in `workers/kronos_service/main.py` with the `NeoQuasar/Kronos-small` and `NeoQuasar/Kronos-base` model loading flow.

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
