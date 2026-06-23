import type { Candle, MarketType, PredictionSummary, SignalLevel, SignalRecord, Timeframe } from "@/lib/types";
import { estimateCosts } from "@/lib/scoring/costs";
import {
  accountCorrelationGate,
  costGate,
  dataGate,
  gatesPassed,
  predictionGate,
  regimeGate,
  riskRewardGate,
  strategyPerformanceGate,
} from "@/lib/scoring/gates";
import { defaultLeverage, estimateLiquidation } from "@/lib/scoring/liquidation";
import { classifyMarketRegime } from "@/lib/scoring/market-regime";
import { scoreAccountRisk, scoreStrategyPerformance } from "@/lib/scoring/risk";
import { summarizeIndicators } from "@/lib/scoring/indicators";

type BuildSignalInput = {
  symbol: string;
  marketType: MarketType;
  timeframe: Timeframe;
  candles: Candle[];
  prediction: PredictionSummary;
  fundingRatePct?: number;
  accountRisk?: Parameters<typeof scoreAccountRisk>[0];
  strategyPerformance?: Parameters<typeof scoreStrategyPerformance>[0];
};

function classifyLevel(totalScore: number): SignalLevel {
  if (totalScore >= 92) return "S";
  if (totalScore >= 88) return "A";
  if (totalScore >= 80) return "B";
  return "C";
}

export function buildSignalCandidate(input: BuildSignalInput) {
  const latest = input.candles.at(-1);
  if (!latest) throw new Error("Cannot build signal without candles");

  const direction = input.prediction.pred_return >= 0 ? "LONG" : "SHORT";
  const marketRegime = classifyMarketRegime(input.candles);
  const indicators = summarizeIndicators(input.candles);
  const atr = indicators.atr14 ?? latest.close * 0.012;
  const entryLow = direction === "LONG" ? latest.close - atr * 0.25 : latest.close - atr * 0.1;
  const entryHigh = direction === "LONG" ? latest.close + atr * 0.1 : latest.close + atr * 0.25;
  const stopLoss = direction === "LONG" ? latest.close - atr * 1.5 : latest.close + atr * 1.5;
  const takeProfit1 = direction === "LONG" ? latest.close + atr * 1.8 : latest.close - atr * 1.8;
  const takeProfit2 = direction === "LONG" ? latest.close + atr * 2.8 : latest.close - atr * 2.8;
  const takeProfit3 = direction === "LONG" ? latest.close + atr * 4 : latest.close - atr * 4;
  const grossExpectedReturn = Math.abs(input.prediction.pred_return);
  const costs = estimateCosts({
    marketType: input.marketType,
    symbol: input.symbol,
    grossExpectedReturn,
    fundingRatePct: input.fundingRatePct,
  });
  const risk = Math.abs(latest.close - stopLoss) / latest.close;
  const reward = Math.abs(takeProfit2 - latest.close) / latest.close;
  const riskReward = risk === 0 ? 0 : reward / risk;
  const accountRisk = scoreAccountRisk(input.accountRisk ?? {});
  const strategyPerformance = scoreStrategyPerformance({
    ...input.strategyPerformance,
    regime: marketRegime,
  });

  const gates = [
    dataGate(input.candles),
    predictionGate(input.prediction, direction),
    regimeGate(marketRegime, input.marketType, direction),
    costGate(input.marketType, input.marketType === "SPOT" ? "SPOT_BUY_DIP" : `FUTURES_${direction}`, costs),
    riskRewardGate(input.marketType, riskReward),
    accountCorrelationGate(accountRisk),
    strategyPerformanceGate(strategyPerformance),
  ];

  const aiScore =
    direction === "LONG" ? input.prediction.ai_score_long : input.prediction.ai_score_short;
  const gateScore = gates.reduce((sum, gate) => sum + gate.score, 0) / gates.length;
  const totalScore = Math.round(aiScore * 0.25 + gateScore * 0.55 + Math.min(100, riskReward * 35) * 0.2);
  const level = classifyLevel(totalScore);
  const leverage = input.marketType === "FUTURES" ? defaultLeverage(input.symbol) : null;
  const liquidation =
    input.marketType === "FUTURES" && leverage
      ? estimateLiquidation({
          direction,
          entryPrice: latest.close,
          stopLoss,
          leverage,
        })
      : null;

  const allowed = gatesPassed(gates) && (level === "A" || level === "S");

  const signal: Omit<SignalRecord, "id"> = {
    signal_id: `${input.symbol}-${input.marketType}-${input.timeframe}-${Date.now()}`,
    symbol: input.symbol,
    market_type: input.marketType,
    timeframe: input.timeframe,
    direction: input.marketType === "SPOT" ? "BUY" : direction,
    signal_type: input.marketType === "SPOT" ? "SPOT_BUY_DIP" : `FUTURES_${direction}`,
    signal_level: level,
    lifecycle_status: allowed ? "CANDIDATE" : "BLOCKED",
    market_regime: marketRegime,
    total_score: totalScore,
    ai_score: aiScore,
    net_expected_return: costs.net_expected_return,
    risk_reward: riskReward,
    current_price: latest.close,
    entry_low: entryLow,
    entry_high: entryHigh,
    stop_loss: stopLoss,
    take_profit_1: takeProfit1,
    take_profit_2: takeProfit2,
    take_profit_3: takeProfit3,
    leverage,
    liquidation_distance_pct: liquidation?.liquidation_distance_pct ?? null,
    email_sent: false,
    created_at: new Date().toISOString(),
  };

  return {
    signal,
    gates,
    costs,
    liquidation,
    emailEligible: allowed,
  };
}
