import type { CostBreakdown, MarketType } from "@/lib/types";

type CostInput = {
  marketType: MarketType;
  symbol: string;
  grossExpectedReturn: number;
  spreadPct?: number;
  fundingRatePct?: number;
  notionalUsd?: number;
};

const slippageBySymbol: Record<string, number> = {
  BTCUSDT: 0.0003,
  ETHUSDT: 0.0003,
  SOLUSDT: 0.0008,
  BNBUSDT: 0.0008,
  XRPUSDT: 0.0008,
  DOGEUSDT: 0.0012,
};

export function estimateCosts(input: CostInput): CostBreakdown {
  const fee = input.marketType === "SPOT" ? 0.001 : 0.0006;
  const slippage = slippageBySymbol[input.symbol] ?? 0.002;
  const spread = input.spreadPct ?? slippage / 2;
  const marketImpact = input.notionalUsd && input.notionalUsd > 50_000 ? 0.0008 : 0.0002;
  const funding = input.marketType === "FUTURES" ? Math.abs(input.fundingRatePct ?? 0) / 100 : 0;
  const total = fee + slippage + spread + marketImpact + funding;

  return {
    estimated_fee_cost: fee,
    estimated_slippage_cost: slippage,
    estimated_spread_cost: spread,
    estimated_market_impact_cost: marketImpact,
    estimated_funding_cost: funding,
    total_estimated_cost: total,
    net_expected_return: input.grossExpectedReturn - total,
  };
}

export function minimumNetReturn(marketType: MarketType, signalType: string) {
  if (marketType === "FUTURES") return 0.006;
  if (signalType === "SPOT_BUY_BREAKOUT") return 0.015;
  return 0.012;
}
