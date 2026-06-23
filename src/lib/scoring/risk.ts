import type { MarketRegime, SignalRecord } from "@/lib/types";

type AccountRiskInput = {
  dailyLossPct?: number;
  weeklyLossPct?: number;
  losingStreak?: number;
  openRiskPct?: number;
  sameDirectionRiskPct?: number;
  correlatedRiskPct?: number;
};

export function scoreAccountRisk(input: AccountRiskInput) {
  const failures: string[] = [];
  if ((input.dailyLossPct ?? 0) <= -0.02) failures.push("Daily loss limit reached");
  if ((input.weeklyLossPct ?? 0) <= -0.05) failures.push("Weekly loss limit reached");
  if ((input.losingStreak ?? 0) >= 5) failures.push("Five-loss streak pauses futures signals");
  if ((input.openRiskPct ?? 0) > 0.03) failures.push("Total open risk is above 3%");
  if ((input.sameDirectionRiskPct ?? 0) > 0.02) failures.push("Same-direction risk is above 2%");
  if ((input.correlatedRiskPct ?? 0) > 0.02) failures.push("Correlated risk is above 2%");

  return {
    passed: failures.length === 0,
    score: Math.max(0, 100 - failures.length * 20),
    reason: failures.length ? failures.join("; ") : "Account and portfolio risk are acceptable",
  };
}

export function scoreStrategyPerformance(input: {
  profitFactor?: number;
  simulationApproved?: boolean;
  backtestApproved?: boolean;
  regime?: MarketRegime;
}) {
  const failures: string[] = [];
  if ((input.profitFactor ?? 1.25) < 1.1) failures.push("Recent profit factor is below 1.1");
  if (input.backtestApproved === false) failures.push("Parameter set is not backtest-approved");
  if (input.simulationApproved === false) failures.push("Parameter set is not simulation-approved");
  if (input.regime === "UNKNOWN") failures.push("Regime-specific performance is unknown");

  return {
    passed: failures.length === 0,
    score: Math.max(0, 100 - failures.length * 25),
    reason: failures.length ? failures.join("; ") : "Strategy performance gate passed",
  };
}

export function keepTopCorrelatedSignals(signals: SignalRecord[], maxCount = 2) {
  return signals
    .slice()
    .sort((left, right) => right.total_score - left.total_score)
    .slice(0, maxCount);
}
