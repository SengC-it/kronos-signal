import { hasSupabaseServerConfig, getSupabaseServiceClient } from "@/lib/supabase/server";
import type { HealthStatus, SignalRecord } from "@/lib/types";
import { tables } from "@/lib/db-tables";

export async function listSignals(limit = 50): Promise<SignalRecord[]> {
  if (!hasSupabaseServerConfig()) return [];

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(tables.signals)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error.message);
    return [];
  }

  return (data ?? []) as SignalRecord[];
}

export async function getSignal(id: string) {
  if (!hasSupabaseServerConfig()) return null;

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.from(tables.signals).select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error(error.message);
    return null;
  }

  return data as SignalRecord | null;
}

export async function countRows(table: string) {
  if (!hasSupabaseServerConfig()) return 0;
  const supabase = getSupabaseServiceClient();
  const { count } = await supabase.from(table).select("*", { count: "exact", head: true });
  return count ?? 0;
}

export async function getPerformanceStats() {
  if (!hasSupabaseServerConfig()) return [];
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from(tables.performanceStats)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getRiskSnapshot() {
  if (!hasSupabaseServerConfig()) return null;
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from(tables.accountSnapshots)
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getParameters() {
  if (!hasSupabaseServerConfig()) return [];
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from(tables.parameterSets)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export async function getLogs() {
  if (!hasSupabaseServerConfig()) return [];
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from(tables.systemLogs)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return data ?? [];
}

export function summarizeHealth(configured: boolean): HealthStatus {
  return configured
    ? { name: "Supabase", ok: true, detail: "Server credentials are configured" }
    : { name: "Supabase", ok: false, detail: "Set Supabase environment variables" };
}
