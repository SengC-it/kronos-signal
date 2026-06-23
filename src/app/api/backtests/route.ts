import { NextRequest, NextResponse } from "next/server";
import { callWorker } from "@/lib/worker";
import { getOperatorUser } from "@/lib/supabase/auth";

export async function POST(request: NextRequest) {
  const user = await getOperatorUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const path = body.mode === "walk_forward" ? "/walk-forward" : "/backtest";
  const result = await callWorker({ path, body, timeoutMs: 55_000 });
  return NextResponse.json(result);
}
