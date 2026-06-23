create extension if not exists pgcrypto;

create type kronos_market_type as enum ('SPOT', 'FUTURES');
create type kronos_signal_direction as enum ('LONG', 'SHORT', 'BUY', 'SELL', 'NO_TRADE');
create type kronos_signal_level as enum ('S', 'A', 'B', 'C');
create type kronos_lifecycle_status as enum (
  'CANDIDATE',
  'BLOCKED',
  'SENT',
  'TRIGGERED',
  'MANUAL_EXECUTED',
  'EXPIRED_NOT_FILLED',
  'TP1_HIT',
  'TP2_HIT',
  'TP3_HIT',
  'SL_HIT',
  'MANUAL_CANCELLED',
  'CLOSED',
  'REVIEWED'
);
create type kronos_market_regime as enum (
  'TREND_UP',
  'TREND_DOWN',
  'RANGE_HIGH',
  'RANGE_LOW',
  'EXTREME_VOLATILITY',
  'LIQUIDITY_THIN',
  'SHORT_SQUEEZE',
  'LONG_SQUEEZE',
  'UNKNOWN'
);

create table kronos_candles (
  id uuid primary key default gen_random_uuid(),
  exchange text not null,
  market_type kronos_market_type not null,
  symbol text not null,
  timeframe text not null,
  timestamp timestamptz not null,
  open numeric not null,
  high numeric not null,
  low numeric not null,
  close numeric not null,
  volume numeric not null default 0,
  quote_volume numeric,
  trade_count integer,
  is_closed boolean not null default true,
  data_source text not null default 'binance',
  created_at timestamptz not null default now(),
  unique (exchange, market_type, symbol, timeframe, timestamp)
);

create table kronos_futures_prices (
  id uuid primary key default gen_random_uuid(),
  exchange text not null,
  symbol text not null,
  timestamp timestamptz not null,
  last_price numeric not null,
  mark_price numeric not null,
  index_price numeric not null,
  basis numeric generated always as (last_price - mark_price) stored,
  premium_rate numeric generated always as ((mark_price - index_price) / nullif(index_price, 0)) stored,
  data_source text not null default 'binance',
  created_at timestamptz not null default now(),
  unique (exchange, symbol, timestamp)
);

create table kronos_futures_metrics (
  id uuid primary key default gen_random_uuid(),
  exchange text not null,
  symbol text not null,
  timestamp timestamptz not null,
  funding_rate numeric,
  funding_rate_pct numeric,
  next_funding_time timestamptz,
  open_interest numeric,
  open_interest_change_15m numeric,
  open_interest_change_1h numeric,
  open_interest_change_4h numeric,
  long_short_ratio numeric,
  taker_buy_volume numeric,
  taker_sell_volume numeric,
  taker_buy_ratio numeric,
  liquidation_long numeric,
  liquidation_short numeric,
  created_at timestamptz not null default now(),
  unique (exchange, symbol, timestamp)
);

create table kronos_predictions (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  market_type kronos_market_type not null,
  timeframe text not null,
  model_name text not null,
  model_version text not null,
  tokenizer_version text,
  prediction_config_version text,
  strategy_version text,
  lookback integer not null,
  pred_len integer not null,
  current_price numeric not null,
  pred_close_end numeric not null,
  pred_high_max numeric not null,
  pred_low_min numeric not null,
  pred_return numeric not null,
  pred_upside numeric not null,
  pred_downside numeric not null,
  pred_volatility numeric,
  risk_reward_long numeric,
  risk_reward_short numeric,
  path_consistency_long numeric not null,
  path_consistency_short numeric not null,
  ai_score_long numeric not null,
  ai_score_short numeric not null,
  raw_prediction_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table kronos_signals (
  id uuid primary key default gen_random_uuid(),
  signal_id text not null unique,
  symbol text not null,
  market_type kronos_market_type not null,
  timeframe text not null,
  direction kronos_signal_direction not null,
  signal_type text not null,
  signal_level kronos_signal_level not null,
  lifecycle_status kronos_lifecycle_status not null default 'CANDIDATE',
  market_regime kronos_market_regime not null default 'UNKNOWN',
  strategy_version text not null default 'v4.0',
  parameter_set_id text,
  model_version text,
  prediction_id uuid references kronos_predictions(id),
  total_score numeric not null default 0,
  ai_score numeric not null default 0,
  trend_score numeric not null default 0,
  volume_score numeric not null default 0,
  risk_reward_score numeric not null default 0,
  futures_risk_score numeric not null default 0,
  account_risk_score numeric not null default 0,
  correlation_risk_score numeric not null default 0,
  current_price numeric not null,
  last_price numeric,
  mark_price numeric,
  index_price numeric,
  entry_low numeric,
  entry_high numeric,
  stop_loss numeric,
  take_profit_1 numeric,
  take_profit_2 numeric,
  take_profit_3 numeric,
  estimated_liquidation_price numeric,
  liquidation_distance_pct numeric,
  leverage numeric,
  margin_mode text,
  position_suggestion text,
  max_loss_pct numeric,
  gross_expected_return numeric,
  estimated_fee_cost numeric not null default 0,
  estimated_slippage_cost numeric not null default 0,
  estimated_spread_cost numeric not null default 0,
  estimated_market_impact_cost numeric not null default 0,
  estimated_funding_cost numeric not null default 0,
  net_expected_return numeric not null default 0,
  expected_value numeric,
  risk_reward numeric not null default 0,
  valid_until timestamptz,
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table kronos_signal_gate_results (
  id uuid primary key default gen_random_uuid(),
  signal_id text not null references kronos_signals(signal_id) on delete cascade,
  gate_name text not null,
  passed boolean not null,
  score numeric not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table kronos_signal_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references kronos_signals(id) on delete cascade,
  event_type kronos_lifecycle_status not null,
  event_time timestamptz not null default now(),
  event_price numeric,
  event_note text,
  created_at timestamptz not null default now()
);

create table kronos_signal_reviews (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references kronos_signals(id) on delete cascade,
  entry_price numeric,
  exit_price numeric,
  entry_time timestamptz,
  exit_time timestamptz,
  max_favorable_price numeric,
  max_adverse_price numeric,
  mfe_pct numeric,
  mae_pct numeric,
  tp1_hit boolean not null default false,
  tp2_hit boolean not null default false,
  tp3_hit boolean not null default false,
  sl_hit boolean not null default false,
  expired_not_filled boolean not null default false,
  final_result text,
  pnl_pct numeric,
  pnl_amount numeric,
  execution_delay_seconds integer,
  actual_slippage numeric,
  review_status text not null default 'PENDING',
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table kronos_account_snapshots (
  id uuid primary key default gen_random_uuid(),
  timestamp timestamptz not null,
  account_equity numeric not null,
  available_balance numeric not null,
  used_margin numeric not null default 0,
  margin_ratio numeric,
  daily_realized_pnl numeric,
  weekly_realized_pnl numeric,
  open_position_count integer not null default 0,
  total_open_risk numeric not null default 0,
  created_at timestamptz not null default now()
);

create table kronos_parameter_sets (
  id uuid primary key default gen_random_uuid(),
  parameter_set_id text not null unique,
  strategy_version text not null,
  market_type kronos_market_type not null,
  timeframe text not null,
  parameters_json jsonb not null default '{}'::jsonb,
  backtest_result_id uuid,
  simulation_result_id uuid,
  is_active boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now(),
  effective_from timestamptz,
  effective_to timestamptz,
  rollback_to text
);

create table kronos_backtest_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null default 'ordinary',
  status text not null default 'QUEUED',
  symbol text,
  market_type kronos_market_type,
  timeframe text,
  parameter_set_id text,
  started_at timestamptz,
  finished_at timestamptz,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create table kronos_walk_forward_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'QUEUED',
  train_days integer not null default 90,
  validation_days integer not null default 30,
  rounds integer not null default 6,
  parameter_set_id text,
  result_json jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table kronos_performance_stats (
  id uuid primary key default gen_random_uuid(),
  scope_type text not null,
  scope_value text not null,
  market_type kronos_market_type,
  timeframe text,
  strategy_version text,
  parameter_set_id text,
  total_signals integer not null default 0,
  total_trades integer not null default 0,
  win_rate numeric,
  avg_profit numeric,
  avg_loss numeric,
  risk_reward_avg numeric,
  profit_factor numeric,
  max_drawdown numeric,
  avg_mfe numeric,
  avg_mae numeric,
  tp1_hit_rate numeric,
  tp2_hit_rate numeric,
  sl_hit_rate numeric,
  expired_rate numeric,
  created_at timestamptz not null default now()
);

create table kronos_data_lineage (
  id uuid primary key default gen_random_uuid(),
  data_type text not null,
  symbol text,
  timeframe text,
  source text not null,
  source_timestamp timestamptz,
  ingested_at timestamptz not null default now(),
  checksum text,
  quality_status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create table kronos_circuit_breaker_events (
  id uuid primary key default gen_random_uuid(),
  breaker_type text not null,
  scope text not null,
  reason text not null,
  active boolean not null default true,
  triggered_at timestamptz not null default now(),
  expires_at timestamptz,
  cleared_at timestamptz
);

create table kronos_strategy_retirements (
  id uuid primary key default gen_random_uuid(),
  strategy_version text not null,
  parameter_set_id text,
  symbol text,
  timeframe text,
  reason text not null,
  retired_at timestamptz not null default now(),
  rollback_to text
);

create table kronos_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid references kronos_signals(id) on delete cascade,
  provider text not null,
  recipient text not null,
  subject text not null,
  status text not null,
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now()
);

create table kronos_system_logs (
  id uuid primary key default gen_random_uuid(),
  level text not null,
  source text not null,
  message text not null,
  context_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index kronos_candles_symbol_timeframe_timestamp_idx on kronos_candles (symbol, timeframe, timestamp desc);
create index kronos_signals_created_at_idx on kronos_signals (created_at desc);
create index kronos_signals_symbol_status_idx on kronos_signals (symbol, lifecycle_status, created_at desc);
create index kronos_performance_stats_scope_idx on kronos_performance_stats (scope_type, scope_value, created_at desc);
create index kronos_system_logs_created_at_idx on kronos_system_logs (created_at desc);

alter table kronos_candles enable row level security;
alter table kronos_futures_prices enable row level security;
alter table kronos_futures_metrics enable row level security;
alter table kronos_predictions enable row level security;
alter table kronos_signals enable row level security;
alter table kronos_signal_gate_results enable row level security;
alter table kronos_signal_lifecycle_events enable row level security;
alter table kronos_signal_reviews enable row level security;
alter table kronos_account_snapshots enable row level security;
alter table kronos_parameter_sets enable row level security;
alter table kronos_backtest_runs enable row level security;
alter table kronos_walk_forward_runs enable row level security;
alter table kronos_performance_stats enable row level security;
alter table kronos_data_lineage enable row level security;
alter table kronos_circuit_breaker_events enable row level security;
alter table kronos_strategy_retirements enable row level security;
alter table kronos_email_deliveries enable row level security;
alter table kronos_system_logs enable row level security;

create policy "authenticated read kronos_candles" on kronos_candles for select to authenticated using (true);
create policy "authenticated read kronos_futures_prices" on kronos_futures_prices for select to authenticated using (true);
create policy "authenticated read kronos_futures_metrics" on kronos_futures_metrics for select to authenticated using (true);
create policy "authenticated read kronos_predictions" on kronos_predictions for select to authenticated using (true);
create policy "authenticated read kronos_signals" on kronos_signals for select to authenticated using (true);
create policy "authenticated read kronos_signal_gate_results" on kronos_signal_gate_results for select to authenticated using (true);
create policy "authenticated read kronos_signal_lifecycle_events" on kronos_signal_lifecycle_events for select to authenticated using (true);
create policy "authenticated read kronos_signal_reviews" on kronos_signal_reviews for select to authenticated using (true);
create policy "authenticated read kronos_account_snapshots" on kronos_account_snapshots for select to authenticated using (true);
create policy "authenticated read kronos_parameter_sets" on kronos_parameter_sets for select to authenticated using (true);
create policy "authenticated read kronos_backtest_runs" on kronos_backtest_runs for select to authenticated using (true);
create policy "authenticated read kronos_walk_forward_runs" on kronos_walk_forward_runs for select to authenticated using (true);
create policy "authenticated read kronos_performance_stats" on kronos_performance_stats for select to authenticated using (true);
create policy "authenticated read kronos_data_lineage" on kronos_data_lineage for select to authenticated using (true);
create policy "authenticated read kronos_circuit_breaker_events" on kronos_circuit_breaker_events for select to authenticated using (true);
create policy "authenticated read kronos_strategy_retirements" on kronos_strategy_retirements for select to authenticated using (true);
create policy "authenticated read kronos_email_deliveries" on kronos_email_deliveries for select to authenticated using (true);
create policy "authenticated read kronos_system_logs" on kronos_system_logs for select to authenticated using (true);
