import { NextRequest, NextResponse } from "next/server";
import { hasSupabaseServerConfig, getSupabaseServiceClient } from "@/lib/supabase/server";
import { getOperatorUser } from "@/lib/supabase/auth";
import { tables } from "@/lib/db-tables";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOperatorUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!hasSupabaseServerConfig()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from(tables.signalLifecycleEvents)
    .insert({
      signal_id: id,
      event_type: body.event_type,
      event_time: body.event_time ?? new Date().toISOString(),
      event_price: body.event_price ?? null,
      event_note: body.event_note ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
