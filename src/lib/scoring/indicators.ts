import type { Candle } from "@/lib/types";

export function sma(values: number[], period: number) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

export function ema(values: number[], period: number) {
  if (values.length < period) return null;
  const multiplier = 2 / (period + 1);
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;

  for (const value of values.slice(period)) {
    current = (value - current) * multiplier + current;
  }

  return current;
}

export function rsi(values: number[], period = 14) {
  if (values.length <= period) return null;
  let gains = 0;
  let losses = 0;

  for (let index = values.length - period; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  if (losses === 0) return 100;
  const relativeStrength = gains / losses;
  return 100 - 100 / (1 + relativeStrength);
}

export function atr(candles: Candle[], period = 14) {
  if (candles.length <= period) return null;
  const ranges: number[] = [];

  for (let index = candles.length - period; index < candles.length; index += 1) {
    const candle = candles[index];
    const previous = candles[index - 1];
    ranges.push(
      Math.max(
        candle.high - candle.low,
        Math.abs(candle.high - previous.close),
        Math.abs(candle.low - previous.close),
      ),
    );
  }

  return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
}

export function macd(values: number[]) {
  const fast = ema(values, 12);
  const slow = ema(values, 26);
  if (fast === null || slow === null) return null;
  return {
    macd: fast - slow,
    fast,
    slow,
  };
}

export function bollinger(values: number[], period = 20, deviation = 2) {
  const middle = sma(values, period);
  if (middle === null || values.length < period) return null;
  const slice = values.slice(-period);
  const variance = slice.reduce((sum, value) => sum + (value - middle) ** 2, 0) / period;
  const standardDeviation = Math.sqrt(variance);
  return {
    upper: middle + standardDeviation * deviation,
    middle,
    lower: middle - standardDeviation * deviation,
    width: middle === 0 ? 0 : (standardDeviation * deviation * 2) / middle,
  };
}

export function swingHigh(candles: Candle[], period = 20) {
  if (candles.length < period) return null;
  return Math.max(...candles.slice(-period).map((candle) => candle.high));
}

export function swingLow(candles: Candle[], period = 20) {
  if (candles.length < period) return null;
  return Math.min(...candles.slice(-period).map((candle) => candle.low));
}

export function summarizeIndicators(candles: Candle[]) {
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const currentAtr = atr(candles, 14);
  const currentClose = closes.at(-1) ?? 0;

  return {
    ema20: ema(closes, 20),
    ema60: ema(closes, 60),
    ema120: ema(closes, 120),
    macd: macd(closes),
    rsi14: rsi(closes, 14),
    atr14: currentAtr,
    atrPct: currentClose > 0 && currentAtr !== null ? currentAtr / currentClose : null,
    bollinger: bollinger(closes, 20),
    volumeMa20: sma(volumes, 20),
    high20: swingHigh(candles, 20),
    low20: swingLow(candles, 20),
    high50: swingHigh(candles, 50),
    low50: swingLow(candles, 50),
  };
}
