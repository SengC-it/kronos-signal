import { getParameters } from "@/lib/data";
import { DataTable } from "@/lib/ui/data-table";
import { StatusPill } from "@/lib/ui/status-pill";
import { requireOperator } from "@/lib/supabase/auth";

type ParameterRow = {
  parameter_set_id: string;
  strategy_version: string;
  market_type: string;
  timeframe: string;
  is_active: boolean;
  backtest_result_id: string | null;
  simulation_result_id: string | null;
  effective_from: string | null;
};

export default async function ParametersPage() {
  await requireOperator();
  const parameters = (await getParameters()) as ParameterRow[];

  return (
    <>
      <h1 className="page-title">Parameter Governance</h1>
      <p className="page-subtitle">Versioned strategy parameters, backtest binding, simulation binding, activation and rollback.</p>
      <DataTable
        columns={["ID", "Strategy", "Market", "TF", "Active", "Backtest", "Simulation", "Effective From"]}
        rows={parameters.map((row) => [
          <span className="mono" key="id">{row.parameter_set_id}</span>,
          row.strategy_version,
          row.market_type,
          row.timeframe,
          <StatusPill key="active" label={row.is_active ? "active" : "paused"} tone={row.is_active ? "good" : "warn"} />,
          row.backtest_result_id ?? "not bound",
          row.simulation_result_id ?? "not bound",
          row.effective_from ?? "n/a",
        ])}
        empty="No parameter sets yet."
      />
    </>
  );
}
