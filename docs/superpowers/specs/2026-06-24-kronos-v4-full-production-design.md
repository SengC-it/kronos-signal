# Kronos V4 Full Production Design

## Purpose

Build an AI crypto spot/futures trading signal quality-control system based on Kronos. The system sends structured email alerts only after prediction, cost, risk, lifecycle, backtest, and strategy-governance checks pass. It does not place orders automatically.

## Product Boundary

The system is a trading decision-support and risk-control product, not an auto-trading bot. V4.0 must support the full lifecycle from market data ingestion to Kronos prediction, scoring, gate checks, email alerts, manual execution tracking, MFE/MAE review, walk-forward validation, parameter governance, and strategy retirement.

The production architecture accepts that Vercel is not the right runtime for Torch/Kronos inference or long-running backtests. Vercel hosts the control plane and UI. Python Docker services host compute-heavy workers.

## Architecture

### Vercel Next.js Application

The Vercel app owns the web console, operator workflows, lightweight API routes, protected admin pages, cron trigger endpoints, and email dispatch endpoints.

Responsibilities:

- Dashboard, signal list, signal detail, performance, risk center, parameter governance, and logs pages.
- API routes for reading Supabase data and triggering worker jobs.
- Cron endpoints protected by `CRON_SECRET`.
- Email dispatch using Resend or SMTP.
- Health checks for Supabase, worker, Kronos service, and mail delivery.

The Next.js app must not import or run Torch, Kronos, or heavy Python model code.

### Supabase

Supabase is the system of record.

Responsibilities:

- Postgres database for candles, futures metrics, predictions, signals, lifecycle events, reviews, account snapshots, parameters, backtests, performance stats, logs, and data lineage.
- Supabase Auth for web console login.
- RLS on exposed tables.
- Service role access only from server-side API routes and workers.
- Realtime updates for signal status and operational dashboards.

### External Python Services

Compute-heavy and long-running work runs outside Vercel.

Services:

- `kronos_service`: FastAPI wrapper around Kronos-small and Kronos-base.
- `scanner_worker`: market data ingestion, indicator calculation, prediction requests, scoring, and gate checks.
- `backtest_worker`: ordinary historical backtests with realistic execution assumptions.
- `walk_forward_worker`: rolling out-of-sample validation.
- `review_worker`: lifecycle tracking, MFE/MAE calculation, and performance-stat refresh.

Each service exposes authenticated HTTP endpoints and writes results to Supabase using server-side credentials.

### Queue And Locking

Use Upstash Redis for:

- Cron idempotency locks.
- Symbol/timeframe scan locks.
- Email deduplication.
- Worker task state.
- Circuit-breaker status cache.
- Rate limiting for manual trigger endpoints.

If Upstash is unavailable, the system falls back to Supabase job tables with advisory locks, but Redis is the production recommendation.

## Supported Markets

Initial full V4 scope:

- Exchange: Binance.
- Spot: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `BNBUSDT`, `XRPUSDT`, `DOGEUSDT`.
- USDT-M perpetual futures: same symbols.
- Timeframes: `15m`, `1h`, `4h`.

Future extension points:

- OKX, Bybit, Bitget, Gate.
- Observation-only meme/new/high-volatility symbols.

## Signal Pipeline

The production pipeline is:

1. Ingest spot and futures OHLCV.
2. Ingest futures mark price, index price, last price, funding, and open interest.
3. Validate data quality and write data lineage.
4. Compute indicators and market regime.
5. Request Kronos-small multi-path prediction.
6. Request Kronos-base confirmation for A/S candidates.
7. Compute prediction metrics and calibrated AI scores.
8. Compute cost model and net expected return.
9. Compute risk/reward, stop/target, leverage, and liquidation safety.
10. Check account-level risk, correlation risk, strategy whitelist/blacklist, circuit breakers, and strategy performance gates.
11. Persist candidate or blocked signal.
12. Send email only for allowed A/S signals.
13. Track lifecycle, manual execution, TP/SL/expiry, MFE/MAE, and review result.
14. Refresh performance stats and strategy governance state.

## Seven Signal Gates

All email-bound signals must pass:

- Data gate: candle continuity, closed latest candle, enough lookback, non-stale futures data, no duplicate or abnormal price/volume.
- Prediction gate: path consistency, prediction space, timeframe alignment, Kronos-small/base conflict check.
- Market-regime gate: only allow strategies whitelisted for the current regime.
- Cost gate: fee, slippage, spread, market impact, funding, and minimum net expected return.
- Risk/reward gate: valid stop quality and minimum risk/reward threshold.
- Account/correlation gate: single-trade risk, same-direction exposure, correlated exposure, daily/weekly loss, margin, and liquidation safety.
- Strategy-performance gate: recent PF, parameter-set validation, simulation validation, and regime-specific historical PF.

Signals that fail a gate remain visible in the console as blocked diagnostics unless the failure is a system/data failure that requires a circuit breaker.

## Database Design

Core tables:

- `candles`
- `futures_prices`
- `futures_metrics`
- `predictions`
- `signals`
- `signal_gate_results`
- `signal_lifecycle_events`
- `signal_reviews`
- `account_snapshots`
- `parameter_sets`
- `backtest_runs`
- `walk_forward_runs`
- `performance_stats`
- `data_lineage`
- `circuit_breaker_events`
- `strategy_retirements`
- `email_deliveries`
- `system_logs`

Security:

- Enable RLS on all public tables.
- Browser clients receive read access only to authenticated users.
- Mutations that affect signals, reviews, parameters, or account snapshots require server-side service role routes.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## UI Design

The web console is a dense trading operations surface, not a marketing site.

Pages:

- Home dashboard: today signals, email count, A/S signals, win rate, PF, drawdown, losing streak, regime, circuit status, account exposure, model status, mail status, data status.
- Signals page: filterable table with symbol, market, timeframe, direction, level, lifecycle, scores, prices, entry zone, stop, targets, leverage, liquidation distance, email status.
- Signal detail page: prediction summary, technical indicators, funding/OI, cost model, expected value, liquidation risk, gate results, email content, lifecycle, MFE/MAE, review.
- Performance page: stats by symbol, timeframe, market, direction, signal type, regime, level, model version, strategy version, and parameter set.
- Risk center: account equity, margin, open risk, same-direction exposure, correlation risk, daily/weekly PnL, circuit breakers, paused strategies and symbols.
- Parameter governance page: create, activate, pause, rollback, bind backtest/simulation results, audit changes, retire strategies.
- Logs page: data quality, worker execution, email delivery, API failures, circuit events.

## Email Alerts

Email alerts are structured execution plans, not opinions.

Contract futures emails include:

- Market, symbol, direction, timeframe, level, lifecycle.
- Last, mark, index, premium/basis.
- Entry zone, leverage, margin mode, position suggestion, max loss, stop, liquidation estimate.
- TP1, TP2, TP3 and trailing plan.
- AI prediction metrics and path consistency.
- Cost breakdown, net expected return, risk/reward.
- Funding/OI, ATR, BTC linkage, account risk, correlation risk, circuit status.
- Reasoning, no-chase rule, invalidation conditions, and manual-execution disclaimer.

Spot emails use defense/invalid levels rather than futures-style hard liquidation framing.

## Backtesting And Validation

Backtests must model:

- Fee, slippage, spread, market impact, funding.
- Stop, targets, dynamic position sizing, cooldown, signal expiry, duplicate filtering.
- Account-level risk, correlation risk, circuit breakers.
- No future leakage: signal time is closed candle plus data delay; earliest entry is next candle or later; no future OI/funding; no future high/low for entry decisions.

Walk-forward uses 90-day tuning windows and 30-day validation windows with at least six rounds.

## Parameter Governance

Every active strategy parameter set records:

- `parameter_set_id`
- `strategy_version`
- `model_version`
- `market_type`
- `timeframe`
- `parameters_json`
- `backtest_result_id`
- `simulation_result_id`
- `effective_from`
- `effective_to`
- `rollback_to`
- `is_active`

Unbacktested or unsimulated parameter sets cannot send real-time email alerts.

## Deployment

### Vercel

Deploys:

- Next.js app.
- API routes.
- Cron routes.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `WORKER_API_URL`
- `WORKER_API_KEY`
- `KRONOS_API_URL`
- `KRONOS_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY` or SMTP variables
- `MAIL_FROM`
- `MAIL_TO`

### Supabase

Provision:

- Auth.
- Postgres.
- RLS policies.
- SQL migrations.
- Optional realtime publication for signal/status tables.

### Python Docker Services

Deploy to a Docker-capable runtime with enough CPU/RAM/GPU for Kronos and backtests.

Required environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WORKER_API_KEY`
- `KRONOS_API_KEY`
- `BINANCE_API_BASE`
- `REDIS_URL` or Upstash REST variables

## Acceptance Criteria

The V4 system is acceptable when:

- Vercel production deployment is live.
- Supabase schema and RLS are applied.
- Admin login protects the console.
- Scheduled scans can run without duplicate jobs.
- Binance data ingestion persists candles and futures metrics.
- Kronos service contract works with real or configured mock inference.
- Signals are generated, gated, stored, and visible in the console.
- Only eligible A/S signals produce email alerts.
- Lifecycle and review events can be recorded.
- Backtest and walk-forward jobs can run asynchronously.
- Parameter sets can be activated, paused, and rolled back.
- Health checks show database, worker, model, email, and data status.
