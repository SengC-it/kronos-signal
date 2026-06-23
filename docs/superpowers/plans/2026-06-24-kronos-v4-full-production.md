# Kronos V4 Full Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy the full V4.0 AI crypto spot/futures trading signal quality-control system using Vercel, Supabase, and external Python worker/model services.

**Architecture:** Next.js on Vercel provides the web console, API gateway, cron triggers, and email dispatch. Supabase stores all trading, lifecycle, risk, backtest, parameter, and audit data. External FastAPI services run Kronos inference, scans, reviews, and backtests.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Supabase Postgres/Auth/RLS, Upstash Redis, Resend/SMTP, FastAPI, Python, Docker, Binance public APIs, Kronos.

---

## File Structure

- Create `package.json`: app scripts and dependencies.
- Create `next.config.ts`: Next.js config.
- Create `tsconfig.json`: TypeScript config.
- Create `postcss.config.mjs`: Tailwind processing.
- Create `src/app/layout.tsx`: root shell.
- Create `src/app/page.tsx`: dashboard.
- Create `src/app/signals/page.tsx`: signal list.
- Create `src/app/signals/[id]/page.tsx`: signal detail.
- Create `src/app/performance/page.tsx`: performance stats.
- Create `src/app/risk/page.tsx`: risk center.
- Create `src/app/parameters/page.tsx`: parameter governance.
- Create `src/app/logs/page.tsx`: logs and audit.
- Create `src/app/api/health/route.ts`: health endpoint.
- Create `src/app/api/cron/scan/route.ts`: cron scan trigger.
- Create `src/app/api/cron/review/route.ts`: review trigger.
- Create `src/app/api/signals/route.ts`: signal API.
- Create `src/app/api/signals/[id]/events/route.ts`: lifecycle event API.
- Create `src/app/api/parameters/route.ts`: parameter governance API.
- Create `src/app/api/backtests/route.ts`: backtest trigger API.
- Create `src/lib/config.ts`: environment parsing.
- Create `src/lib/supabase/server.ts`: lazy Supabase service client.
- Create `src/lib/supabase/browser.ts`: browser Supabase client.
- Create `src/lib/worker.ts`: authenticated worker client.
- Create `src/lib/email.ts`: Resend/SMTP email abstraction.
- Create `src/lib/scoring/*.ts`: indicators, costs, gates, signal scoring, regimes, risk.
- Create `src/lib/ui/*.tsx`: shared dashboard UI components.
- Create `supabase/migrations/001_initial_schema.sql`: database schema and RLS.
- Create `workers/README.md`: external worker deployment contract.
- Create `workers/kronos_service/main.py`: FastAPI Kronos contract with mock fallback.
- Create `workers/scanner_worker/main.py`: scan endpoint contract.
- Create `workers/backtest_worker/main.py`: backtest endpoint contract.
- Create `workers/review_worker/main.py`: lifecycle review endpoint contract.
- Create `workers/requirements.txt`: Python worker dependencies.
- Create `workers/Dockerfile`: worker Docker image.
- Create `.env.example`: required configuration.
- Create `vercel.json`: cron schedules.
- Create `README.md`: setup, Supabase, Vercel, worker deployment.

## Task 1: Scaffold Next.js Production App

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `postcss.config.mjs`
- Create: `src/app/layout.tsx`
- Create: `src/app/globals.css`
- Create: `.gitignore`

- [ ] **Step 1: Create package scripts and dependencies**

Create `package.json` with Next.js, Supabase, Redis, Resend, and UI dependencies pinned through the generated lockfile.

- [ ] **Step 2: Create TypeScript and Next config**

Use App Router, strict TypeScript, and server runtime defaults compatible with Vercel.

- [ ] **Step 3: Create root layout and global styles**

Use a dense dark trading-console layout with stable typography and no marketing hero.

- [ ] **Step 4: Install dependencies**

Run: `npm install`
Expected: `package-lock.json` is created and install exits successfully.

- [ ] **Step 5: Verify scaffold**

Run: `npm run typecheck`
Expected: TypeScript exits with no errors.

## Task 2: Define Environment And Service Clients

**Files:**
- Create: `.env.example`
- Create: `src/lib/config.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/worker.ts`
- Create: `src/lib/email.ts`

- [ ] **Step 1: Write `.env.example`**

Include Supabase, Vercel cron, worker, Kronos, Redis, and mail variables without real secrets.

- [ ] **Step 2: Implement environment parsing**

Expose typed getters and fail only at runtime, not module import time, so `next build` is safe.

- [ ] **Step 3: Implement Supabase clients**

Use `@supabase/supabase-js`; browser client uses anon key, server client uses service role only inside server code.

- [ ] **Step 4: Implement worker client**

POST JSON to external workers with `Authorization: Bearer ${WORKER_API_KEY}`.

- [ ] **Step 5: Implement email adapter**

Prefer Resend when `RESEND_API_KEY` exists; otherwise use SMTP if configured; otherwise record a dry-run result.

## Task 3: Create Supabase Schema And RLS

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `src/lib/types.ts`

- [ ] **Step 1: Create enums**

Define market type, signal direction, signal type, signal level, lifecycle status, market regime, gate status, and job status enums.

- [ ] **Step 2: Create market data tables**

Create `candles`, `futures_prices`, `futures_metrics`, and `data_lineage` with unique indexes on exchange, market, symbol, timeframe, and timestamp.

- [ ] **Step 3: Create prediction and signal tables**

Create `predictions`, `signals`, `signal_gate_results`, `signal_lifecycle_events`, and `email_deliveries`.

- [ ] **Step 4: Create review and performance tables**

Create `signal_reviews`, `performance_stats`, `backtest_runs`, and `walk_forward_runs`.

- [ ] **Step 5: Create risk and governance tables**

Create `account_snapshots`, `parameter_sets`, `circuit_breaker_events`, `strategy_retirements`, and `system_logs`.

- [ ] **Step 6: Enable RLS**

Enable RLS on all public tables; authenticated users get read access; service role handles writes.

- [ ] **Step 7: Verify migration**

Apply through Supabase migration tooling or connector after the project is selected.

## Task 4: Implement Domain Scoring Modules

**Files:**
- Create: `src/lib/scoring/indicators.ts`
- Create: `src/lib/scoring/market-regime.ts`
- Create: `src/lib/scoring/costs.ts`
- Create: `src/lib/scoring/liquidation.ts`
- Create: `src/lib/scoring/risk.ts`
- Create: `src/lib/scoring/gates.ts`
- Create: `src/lib/scoring/signals.ts`

- [ ] **Step 1: Implement technical indicators**

Add EMA, RSI, ATR, MACD, Bollinger bands, swing high/low, and volume MA helpers.

- [ ] **Step 2: Implement market regime**

Classify `TREND_UP`, `TREND_DOWN`, `RANGE_HIGH`, `RANGE_LOW`, `EXTREME_VOLATILITY`, `LIQUIDITY_THIN`, `SHORT_SQUEEZE`, `LONG_SQUEEZE`, and `UNKNOWN`.

- [ ] **Step 3: Implement cost model**

Calculate fee, slippage, spread, market impact, funding, total cost, and net expected return.

- [ ] **Step 4: Implement liquidation checks**

Estimate liquidation price, liquidation distance, stop/liquidation safety ratio, and leverage caps.

- [ ] **Step 5: Implement account and correlation risk**

Score single-trade risk, same-direction exposure, correlated exposure, daily/weekly loss, and losing streak.

- [ ] **Step 6: Implement seven gates**

Return pass/block diagnostics for data, prediction, regime, cost, risk/reward, account/correlation, and strategy-performance gates.

- [ ] **Step 7: Implement final signal builder**

Create spot and futures signal candidates with level assignment, lifecycle status, email eligibility, entry zone, stop, targets, and invalidation reasons.

## Task 5: Implement API Routes And Cron

**Files:**
- Create: `src/app/api/health/route.ts`
- Create: `src/app/api/cron/scan/route.ts`
- Create: `src/app/api/cron/review/route.ts`
- Create: `src/app/api/signals/route.ts`
- Create: `src/app/api/signals/[id]/events/route.ts`
- Create: `src/app/api/parameters/route.ts`
- Create: `src/app/api/backtests/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Health endpoint**

Return status for Supabase, worker, Kronos, Redis, and email configuration.

- [ ] **Step 2: Scan cron endpoint**

Validate `Authorization: Bearer ${CRON_SECRET}`, call scanner worker, and return job summary.

- [ ] **Step 3: Review cron endpoint**

Validate cron secret, call review worker, and return lifecycle update summary.

- [ ] **Step 4: Signal query endpoint**

Return paginated signals with filters for market, symbol, timeframe, direction, level, and lifecycle.

- [ ] **Step 5: Lifecycle event endpoint**

Allow server-side creation of manual execution, cancel, TP, SL, close, and review events.

- [ ] **Step 6: Parameter endpoint**

List and mutate parameter sets through server-side Supabase service access.

- [ ] **Step 7: Backtest endpoint**

Trigger external backtest or walk-forward jobs and persist job rows.

- [ ] **Step 8: Configure Vercel cron**

Add `/api/cron/scan` and `/api/cron/review` schedules in `vercel.json`.

## Task 6: Build Web Console Pages

**Files:**
- Create: `src/lib/ui/stat-card.tsx`
- Create: `src/lib/ui/status-pill.tsx`
- Create: `src/lib/ui/data-table.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/signals/page.tsx`
- Create: `src/app/signals/[id]/page.tsx`
- Create: `src/app/performance/page.tsx`
- Create: `src/app/risk/page.tsx`
- Create: `src/app/parameters/page.tsx`
- Create: `src/app/logs/page.tsx`

- [ ] **Step 1: Shared UI components**

Create metric cards, status pills, and compact data tables for trading operations.

- [ ] **Step 2: Dashboard**

Display signal counts, win rate, PF, drawdown, losing streak, market regime, circuit status, account exposure, model status, mail status, and data status.

- [ ] **Step 3: Signals page**

Display filterable signal table with prices, scores, level, lifecycle, gate state, and email state.

- [ ] **Step 4: Signal detail**

Display prediction, technical indicators, futures data, cost model, risk checks, gate results, email content, lifecycle events, and review metrics.

- [ ] **Step 5: Performance page**

Display grouped performance stats by symbol, timeframe, market, direction, signal type, regime, model, strategy, and parameter set.

- [ ] **Step 6: Risk center**

Display account equity, available balance, margin, open risk, same-direction exposure, correlation exposure, PnL, breakers, paused strategies, and paused symbols.

- [ ] **Step 7: Parameter governance**

Display parameter versions, backtest binding, simulation binding, activation, pause, rollback, and retirement state.

- [ ] **Step 8: Logs**

Display data lineage, system logs, circuit events, worker execution, and email delivery logs.

## Task 7: Implement Python Worker Contracts

**Files:**
- Create: `workers/requirements.txt`
- Create: `workers/Dockerfile`
- Create: `workers/README.md`
- Create: `workers/kronos_service/main.py`
- Create: `workers/scanner_worker/main.py`
- Create: `workers/backtest_worker/main.py`
- Create: `workers/review_worker/main.py`

- [ ] **Step 1: Create Python dependencies**

Include FastAPI, Uvicorn, pandas, numpy, httpx, pydantic, supabase, and optional Torch/Kronos dependencies.

- [ ] **Step 2: Kronos service contract**

Expose `/health` and `/predict`; support mock mode when real Kronos weights are unavailable.

- [ ] **Step 3: Scanner worker contract**

Expose `/health` and `/scan`; accept symbols, timeframes, and market types; call Kronos service; write data and signals to Supabase.

- [ ] **Step 4: Backtest worker contract**

Expose `/health`, `/backtest`, and `/walk-forward`; persist run status and result metrics.

- [ ] **Step 5: Review worker contract**

Expose `/health` and `/review`; update lifecycle, MFE/MAE, and performance stats.

- [ ] **Step 6: Dockerize workers**

Create a single Dockerfile that can launch each service by module path.

## Task 8: Deployment Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Document Supabase setup**

Explain project creation, migration application, RLS, auth, and environment variables.

- [ ] **Step 2: Document Vercel setup**

Explain Vercel project creation, env vars, cron, deployment, and post-deploy health checks.

- [ ] **Step 3: Document worker deployment**

Explain Docker build, required env vars, health checks, and how Vercel calls worker endpoints.

- [ ] **Step 4: Document trading safety**

State that the system sends alerts only, never places orders, and needs simulation before live use.

## Task 9: Verification

**Files:**
- Modify as needed based on verification output.

- [ ] **Step 1: Typecheck**

Run: `npm run typecheck`
Expected: no TypeScript errors.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no lint errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: Next.js production build succeeds.

- [ ] **Step 4: Worker syntax check**

Run: `python -m compileall workers`
Expected: all worker Python modules compile.

- [ ] **Step 5: Local smoke test**

Run the app and call `/api/health`.
Expected: health JSON reports configured/missing dependencies without crashing.

## Task 10: Production Deployment

**Files:**
- Modify `.vercel/project.json` only through Vercel CLI/linking.

- [ ] **Step 1: Install and configure Supabase**

Create or select Supabase project, apply migrations, set auth settings, and collect env vars.

- [ ] **Step 2: Configure Vercel env vars**

Add Supabase, cron, worker, Kronos, Redis, and email variables for production.

- [ ] **Step 3: Deploy workers**

Deploy Python Docker services to the chosen Docker-capable runtime and verify `/health`.

- [ ] **Step 4: Deploy Vercel app**

Deploy to production and verify build status.

- [ ] **Step 5: Post-deploy smoke test**

Visit dashboard, call health endpoint, trigger dry-run scan, verify Supabase writes, and verify email dry-run or delivery.

## Self-Review

- Spec coverage: The plan covers Vercel, Supabase, external workers, scoring, gates, lifecycle, review, backtest, parameter governance, email, and deployment.
- Placeholder scan: No TBD/TODO/fill-in placeholders are intentionally left.
- Type consistency: Signal, market, lifecycle, gate, parameter, and worker names match the design document.
