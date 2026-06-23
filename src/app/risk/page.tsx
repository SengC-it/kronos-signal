import { getRiskSnapshot } from "@/lib/data";
import { StatCard } from "@/lib/ui/stat-card";
import { requireOperator } from "@/lib/supabase/auth";

type RiskSnapshot = {
  account_equity: number;
  available_balance: number;
  margin_ratio: number | null;
  total_open_risk: number;
};

export default async function RiskPage() {
  await requireOperator();
  const risk = (await getRiskSnapshot()) as RiskSnapshot | null;

  return (
    <>
      <h1 className="page-title">Risk Center</h1>
      <p className="page-subtitle">Account, margin, same-direction exposure, correlation risk, and circuit state.</p>
      <div className="grid grid-4">
        <StatCard label="Account Equity" value={risk?.account_equity ?? "n/a"} />
        <StatCard label="Available Balance" value={risk?.available_balance ?? "n/a"} />
        <StatCard label="Margin Ratio" value={risk?.margin_ratio ?? "n/a"} />
        <StatCard label="Open Risk" value={risk?.total_open_risk ?? "n/a"} />
      </div>
    </>
  );
}
