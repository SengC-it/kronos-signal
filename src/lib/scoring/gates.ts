import type { Candle, CostBreakdown, GateResult, MarketRegime, MarketType, PredictionSummary } from "@/lib/types";
import { minimumNetReturn } from "@/lib/scoring/costs";
import { isStrategyAllowed } from "@/lib/scoring/market-regime";

export function dataGate(candles: Candle[]): GateResult {
  if (candles.length < 120) {
    return { gate: "DATA", passed: false, score: 0, reason: "Not enough closed candles" };
  }

  const latest = candles.at(-1);
  if (!latest?.is_closed) {
    return { gate: "DATA", passed: false, score: 20, reason: "Latest candle is not closed" };
  }

  const hasInvalidPrice = candles.some(
    (candle) => candle.open <= 0 || candle.high <= 0 || candle.low <= 0 || candle.close <= 0,
  );
  if (hasInvalidPrice) {
    return { gate: "DATA", passed: false, score: 0, reason: "Invalid price detected" };
  }

  return { gate: "DATA", passed: true, score: 100, reason: "Market data is usable" };
}

export function predictionGate(prediction: PredictionSummary, direction: "LONG" | "SHORT"): GateResult {
  const consistency =
    direction === "LONG" ? prediction.path_consistency_long : prediction.path_consistency_short;
  const predictedSpace =
    direction === "LONG" ? prediction.pred_upside : Math.abs(prediction.pred_downside);

  if (consistency < 0.8) {
    return {
      gate: "PREDICTION",
      passed: false,
      score: Math.round(consistency * 100),
      reason: "Kronos path consistency is below 80%",
    };
  }

  if (predictedSpace < 0.006) {
    return {
      gate: "PREDICTION",
      passed: false,
      score: 50,
      reason: "Predicted price space is too small after trading friction",
    };
  }

  return {
    gate: "PREDICTION",
    passed: true,
    score: Math.round(consistency * 100),
    reason: "Prediction gate passed",
  };
}

export function regimeGate(regime: MarketRegime, marketType: MarketType, direction: "LONG" | "SHORT"): GateResult {
  const passed = isStrategyAllowed(regime, marketType, direction);
  return {
    gate: "MARKET_REGIME",
    passed,
    score: passed ? 100 : 0,
    reason: passed ? `Regime ${regime} allows this strategy` : `Regime ${regime} blocks this strategy`,
  };
}

export function costGate(marketType: MarketType, signalType: string, costs: CostBreakdown): GateResult {
  const minimum = minimumNetReturn(marketType, signalType);
  const passed = costs.net_expected_return >= minimum;

  return {
    gate: "COST",
    passed,
    score: Math.max(0, Math.min(100, Math.round((costs.net_expected_return / minimum) * 100))),
    reason: passed
      ? "Net expected return is above minimum threshold"
      : "Net expected return is below minimum threshold",
  };
}

export function riskRewardGate(marketType: MarketType, riskReward: number): GateResult {
  const minimum = marketType === "SPOT" ? 1.5 : 1.8;
  const passed = riskReward >= minimum;

  return {
    gate: "RISK_REWARD",
    passed,
    score: Math.max(0, Math.min(100, Math.round((riskReward / minimum) * 100))),
    reason: passed ? "Risk/reward threshold passed" : "Risk/reward threshold failed",
  };
}

export function accountCorrelationGate(input: { passed: boolean; score: number; reason: string }): GateResult {
  return {
    gate: "ACCOUNT_CORRELATION",
    passed: input.passed,
    score: input.score,
    reason: input.reason,
  };
}

export function strategyPerformanceGate(input: { passed: boolean; score: number; reason: string }): GateResult {
  return {
    gate: "STRATEGY_PERFORMANCE",
    passed: input.passed,
    score: input.score,
    reason: input.reason,
  };
}

export function gatesPassed(gates: GateResult[]) {
  return gates.every((gate) => gate.passed);
}
