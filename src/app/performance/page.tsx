import { getPerformanceStats } from "@/lib/data";
import { DataTable } from "@/lib/ui/data-table";
import { requireOperator } from "@/lib/supabase/auth";

type PerformanceRow = {
  scope_type: string;
  scope_value: string;
  market_type: string | null;
  timeframe: string | null;
  total_signals: number;
  win_rate: number | null;
  profit_factor: number | null;
  max_drawdown: number | null;
  tp1_hit_rate: number | null;
  sl_hit_rate: number | null;
};

export default async function PerformancePage() {
  await requireOperator();
  const stats = (await getPerformanceStats()) as PerformanceRow[];

  return (
    <>
      <h1 className="page-title">Performance</h1>
      <p className="page-subtitle">Grouped PF, win rate, drawdown, MFE/MAE, TP/SL and execution quality.</p>
      <DataTable
        columns={["Scope", "Market", "TF", "Signals", "Win Rate", "PF", "Max DD", "TP1", "SL"]}
        rows={stats.map((row) => [
          `${row.scope_type}:${row.scope_value}`,
          row.market_type,
          row.timeframe,
          row.total_signals,
          `${Number(row.win_rate ?? 0).toFixed(2)}%`,
          Number(row.profit_factor ?? 0).toFixed(2),
          `${Number(row.max_drawdown ?? 0).toFixed(2)}%`,
          `${Number(row.tp1_hit_rate ?? 0).toFixed(2)}%`,
          `${Number(row.sl_hit_rate ?? 0).toFixed(2)}%`,
        ])}
        empty="No performance stats yet. Run review and backtest workers."
      />
    </>
  );
}
