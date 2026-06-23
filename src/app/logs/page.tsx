import { getLogs } from "@/lib/data";
import { DataTable } from "@/lib/ui/data-table";
import { requireOperator } from "@/lib/supabase/auth";

type LogRow = {
  created_at: string;
  level: string;
  source: string;
  message: string;
};

export default async function LogsPage() {
  await requireOperator();
  const logs = (await getLogs()) as LogRow[];

  return (
    <>
      <h1 className="page-title">Logs</h1>
      <p className="page-subtitle">System logs, data quality events, circuit breakers, worker runs and email delivery diagnostics.</p>
      <DataTable
        columns={["Time", "Level", "Source", "Message"]}
        rows={logs.map((row) => [
          <span className="mono" key="time">{row.created_at}</span>,
          row.level,
          row.source,
          row.message,
        ])}
        empty="No system logs yet."
      />
    </>
  );
}
