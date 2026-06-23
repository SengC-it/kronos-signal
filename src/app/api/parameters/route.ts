import { NextRequest, NextResponse } from "next/server";
import { getParameters } from "@/lib/data";
import { hasSupabaseServerConfig, getSupabaseServiceClient } from "@/lib/supabase/server";
import { getOperatorUser } from "@/lib/supabase/auth";
import { tables } from "@/lib/db-tables";

export async function GET() {
  const user = await getOperatorUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ data: await getParameters() });
}

export async function POST(request: NextRequest) {
  const user = await getOperatorUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const body = await request.json();
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(tables.parameterSets)
    .insert({
      parameter_set_id: body.parameter_set_id,
      strategy_version: body.strategy_version,
      market_type: body.market_type,
      timeframe: body.timeframe,
      parameters_json: body.parameters_json ?? {},
      is_active: Boolean(body.is_active),
      created_by: body.created_by ?? user.email ?? user.id,
      effective_from: body.effective_from ?? new Date().toISOString(),
      rollback_to: body.rollback_to ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
