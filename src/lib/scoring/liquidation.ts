import type { Direction } from "@/lib/types";

type LiquidationInput = {
  direction: Direction;
  entryPrice: number;
  stopLoss: number;
  leverage: number;
  maintenanceMarginRate?: number;
};

export function estimateLiquidation(input: LiquidationInput) {
  const maintenance = input.maintenanceMarginRate ?? 0.005;
  const initialMarginRate = 1 / Math.max(input.leverage, 1);
  const longLiquidation = input.entryPrice * (1 - initialMarginRate + maintenance);
  const shortLiquidation = input.entryPrice * (1 + initialMarginRate - maintenance);
  const estimatedLiquidationPrice = input.direction === "SHORT" ? shortLiquidation : longLiquidation;
  const liquidationDistancePct =
    Math.abs(input.entryPrice - estimatedLiquidationPrice) / input.entryPrice;
  const stopDistancePct = Math.abs(input.entryPrice - input.stopLoss) / input.entryPrice;
  const stopToLiquidationSafetyRatio =
    stopDistancePct === 0 ? 0 : liquidationDistancePct / stopDistancePct;

  return {
    estimated_liquidation_price: estimatedLiquidationPrice,
    liquidation_distance_pct: liquidationDistancePct,
    stop_to_liquidation_safety_ratio: stopToLiquidationSafetyRatio,
    initial_margin: initialMarginRate,
    maintenance_margin_estimate: maintenance,
    safe: stopToLiquidationSafetyRatio >= 2,
  };
}

export function defaultLeverage(symbol: string) {
  if (symbol === "BTCUSDT" || symbol === "ETHUSDT") return 3;
  if (symbol === "SOLUSDT" || symbol === "BNBUSDT" || symbol === "XRPUSDT") return 2;
  if (symbol === "DOGEUSDT") return 2;
  return 1;
}
