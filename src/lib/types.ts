export type MarketType = "SPOT" | "FUTURES";
export type Timeframe = "15m" | "1h" | "4h";
export type Direction = "LONG" | "SHORT" | "BUY" | "SELL" | "NO_TRADE";
export type SignalLevel = "S" | "A" | "B" | "C";
export type LifecycleStatus =
  | "CANDIDATE"
  | "BLOCKED"
  | "SENT"
  | "TRIGGERED"
  | "MANUAL_EXECUTED"
  | "EXPIRED_NOT_FILLED"
  | "TP1_HIT"
  | "TP2_HIT"
  | "TP3_HIT"
  | "SL_HIT"
  | "MANUAL_CANCELLED"
  | "CLOSED"
  | "REVIEWED";

export type MarketRegime =
  | "TREND_UP"
  | "TREND_DOWN"
  | "RANGE_HIGH"
  | "RANGE_LOW"
  | "EXTREME_VOLATILITY"
  | "LIQUIDITY_THIN"
  | "SHORT_SQUEEZE"
  | "LONG_SQUEEZE"
  | "UNKNOWN";

export type GateName =
  | "DATA"
  | "PREDICTION"
  | "MARKET_REGIME"
  | "COST"
  | "RISK_REWARD"
  | "ACCOUNT_CORRELATION"
  | "STRATEGY_PERFORMANCE";

export type GateResult = {
  gate: GateName;
  passed: boolean;
  score: number;
  reason: string;
};

export type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  quote_volume?: number;
  trade_count?: number;
  is_closed?: boolean;
};

export type PredictionSummary = {
  model_name: string;
  model_version: string;
  current_price: number;
  pred_close_end: number;
  pred_high_max: number;
  pred_low_min: number;
  pred_return: number;
  pred_upside: number;
  pred_downside: number;
  pred_volatility: number;
  path_consistency_long: number;
  path_consistency_short: number;
  ai_score_long: number;
  ai_score_short: number;
  raw_prediction_json?: unknown;
};

export type CostBreakdown = {
  estimated_fee_cost: number;
  estimated_slippage_cost: number;
  estimated_spread_cost: number;
  estimated_market_impact_cost: number;
  estimated_funding_cost: number;
  total_estimated_cost: number;
  net_expected_return: number;
};

export type SignalRecord = {
  id: string;
  signal_id: string;
  symbol: string;
  market_type: MarketType;
  timeframe: Timeframe;
  direction: Direction;
  signal_type: string;
  signal_level: SignalLevel;
  lifecycle_status: LifecycleStatus;
  market_regime: MarketRegime;
  total_score: number;
  ai_score: number;
  net_expected_return: number;
  risk_reward: number;
  current_price: number;
  entry_low: number | null;
  entry_high: number | null;
  stop_loss: number | null;
  take_profit_1: number | null;
  take_profit_2: number | null;
  take_profit_3: number | null;
  leverage: number | null;
  liquidation_distance_pct: number | null;
  email_sent: boolean;
  created_at: string;
};

export type HealthStatus = {
  name: string;
  ok: boolean;
  detail: string;
};
