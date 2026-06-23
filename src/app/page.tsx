import { countRows, listSignals } from "@/lib/data";
import { StatCard } from "@/lib/ui/stat-card";
import { DataTable } from "@/lib/ui/data-table";
import { StatusPill } from "@/lib/ui/status-pill";
import { requireOperator } from "@/lib/supabase/auth";
import { tables } from "@/lib/db-tables";

export default async function DashboardPage() {
  await requireOperator();
  const [signals, signalCount, emails, breakers] = await Promise.all([
    listSignals(8),
    countRows(tables.signals),
    countRows(tables.emailDeliveries),
    countRows(tables.circuitBreakerEvents),
  ]);

  const rows = signals.map((signal) => [
    <span className="mono" key="symbol">{signal.symbol}</span>,
    signal.market_type,
    signal.timeframe,
    signal.direction,
    <StatusPill key="level" label={signal.signal_level} tone={signal.signal_level === "S" ? "good" : "neutral"} />,
    signal.lifecycle_status,
    signal.total_score,
    signal.email_sent ? "sent" : "pending",
  ]);

  return (
    <>
      <h1 className="page-title">Trading Signal Operations</h1>
      <p className="page-subtitle">Production console for Kronos V4 signal quality, risk, and lifecycle control.</p>
      <div className="grid grid-4">
        <StatCard label="Total Signals" value={signalCount} hint="All persisted signals" />
        <StatCard label="Email Deliveries" value={emails} hint="Structured alert attempts" />
        <StatCard label="Circuit Events" value={breakers} hint="Market, system, and model breakers" />
        <StatCard label="Recent Signals" value={signals.length} hint="Last rows loaded from Supabase" />
      </div>
      <div style={{ height: 18 }} />
      <DataTable
        columns={["Symbol", "Market", "TF", "Direction", "Level", "Lifecycle", "Score", "Email"]}
        rows={rows}
        empty="No signals yet. Configure Supabase and trigger the scan worker."
      />
    </>
  );
}
