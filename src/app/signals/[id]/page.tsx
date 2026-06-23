import { getSignal } from "@/lib/data";
import { StatCard } from "@/lib/ui/stat-card";
import { StatusPill } from "@/lib/ui/status-pill";
import { requireOperator } from "@/lib/supabase/auth";

export default async function SignalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireOperator();
  const { id } = await params;
  const signal = await getSignal(id);

  if (!signal) {
    return (
      <>
        <h1 className="page-title">Signal Detail</h1>
        <p className="page-subtitle">Signal was not found or Supabase is not configured.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="page-title">{signal.symbol} {signal.direction}</h1>
      <p className="page-subtitle">
        <StatusPill label={signal.signal_level} tone={signal.signal_level === "S" ? "good" : "neutral"} />{" "}
        {signal.market_type} {signal.timeframe} {signal.lifecycle_status}
      </p>
      <div className="grid grid-4">
        <StatCard label="Total Score" value={signal.total_score} />
        <StatCard label="AI Score" value={signal.ai_score} />
        <StatCard label="Net Expected Return" value={`${(signal.net_expected_return * 100).toFixed(2)}%`} />
        <StatCard label="Risk Reward" value={signal.risk_reward.toFixed(2)} />
      </div>
      <div style={{ height: 18 }} />
      <section className="panel">
        <h2>Execution Plan</h2>
        <p className="muted">Entry {signal.entry_low?.toFixed(4)} - {signal.entry_high?.toFixed(4)}</p>
        <p>Stop: {signal.stop_loss?.toFixed(4)} | TP1: {signal.take_profit_1?.toFixed(4)} | TP2: {signal.take_profit_2?.toFixed(4)} | TP3: {signal.take_profit_3?.toFixed(4)}</p>
        <p>Leverage: {signal.leverage ?? "spot"} | Liquidation distance: {signal.liquidation_distance_pct ? `${(signal.liquidation_distance_pct * 100).toFixed(2)}%` : "n/a"}</p>
      </section>
    </>
  );
}
