import type { Candle, MarketRegime } from "@/lib/types";
import { summarizeIndicators } from "@/lib/scoring/indicators";

export function classifyMarketRegime(candles: Candle[]): MarketRegime {
  if (candles.length < 120) return "UNKNOWN";

  const latest = candles.at(-1);
  if (!latest) return "UNKNOWN";

  const indicators = summarizeIndicators(candles);
  const ema20 = indicators.ema20;
  const ema60 = indicators.ema60;
  const ema120 = indicators.ema120;
  const atrPct = indicators.atrPct ?? 0;
  const volumeMa20 = indicators.volumeMa20 ?? 0;
  const bollinger = indicators.bollinger;

  if (atrPct > 0.045) return "EXTREME_VOLATILITY";
  if (volumeMa20 > 0 && latest.volume < volumeMa20 * 0.35) return "LIQUIDITY_THIN";

  const oneBarMove = (latest.close - latest.open) / latest.open;
  if (oneBarMove > 0.025 && latest.close > latest.open && latest.volume > volumeMa20 * 1.8) {
    return "SHORT_SQUEEZE";
  }
  if (oneBarMove < -0.025 && latest.close < latest.open && latest.volume > volumeMa20 * 1.8) {
    return "LONG_SQUEEZE";
  }

  if (ema20 && ema60 && ema120 && latest.close > ema20 && ema20 > ema60 && ema60 > ema120) {
    return "TREND_UP";
  }
  if (ema20 && ema60 && ema120 && latest.close < ema20 && ema20 < ema60 && ema60 < ema120) {
    return "TREND_DOWN";
  }

  if (bollinger && latest.close > bollinger.middle) return "RANGE_HIGH";
  if (bollinger && latest.close <= bollinger.middle) return "RANGE_LOW";

  return "UNKNOWN";
}

export function isStrategyAllowed(regime: MarketRegime, marketType: "SPOT" | "FUTURES", direction: string) {
  if (["EXTREME_VOLATILITY", "LIQUIDITY_THIN", "UNKNOWN"].includes(regime)) return false;
  if (regime === "SHORT_SQUEEZE" && marketType === "FUTURES" && direction === "LONG") return false;
  if (regime === "LONG_SQUEEZE" && marketType === "FUTURES" && direction === "SHORT") return false;
  if (regime === "RANGE_HIGH" && marketType === "FUTURES") return false;
  if (regime === "TREND_UP" && direction === "SHORT") return false;
  if (regime === "TREND_DOWN" && direction === "LONG") return false;
  return true;
}
