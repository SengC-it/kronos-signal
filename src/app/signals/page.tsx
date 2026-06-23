import Link from "next/link";
import { listSignals } from "@/lib/data";
import { DataTable } from "@/lib/ui/data-table";
import { StatusPill } from "@/lib/ui/status-pill";
import { requireOperator } from "@/lib/supabase/auth";

export default async function SignalsPage() {
  await requireOperator();
  const signals = await listSignals(100);

  return (
    <>
      <h1 className="page-title">Signals</h1>
      <p className="page-subtitle">All candidates, blocked diagnostics, sent alerts, and lifecycle states.</p>
      <DataTable
        columns={["ID", "Symbol", "Market", "TF", "Direction", "Level", "Status", "Score", "Net EV", "R/R", "Email"]}
        rows={signals.map((signal) => [
          <Link className="mono" href={`/signals/${signal.id}`} key="id">{signal.signal_id.slice(0, 18)}</Link>,
          signal.symbol,
          signal.market_type,
          signal.timeframe,
          signal.direction,
          <StatusPill key="level" label={signal.signal_level} tone={signal.signal_level === "S" ? "good" : "neutral"} />,
          signal.lifecycle_status,
          signal.total_score,
          `${(signal.net_expected_return * 100).toFixed(2)}%`,
          signal.risk_reward.toFixed(2),
          signal.email_sent ? "sent" : "no",
        ])}
        empty="No signals have been generated."
      />
    </>
  );
}
