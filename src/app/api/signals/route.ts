import { NextResponse } from "next/server";
import { listSignals } from "@/lib/data";
import { getOperatorUser } from "@/lib/supabase/auth";

export async function GET() {
  const user = await getOperatorUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const signals = await listSignals(100);
  return NextResponse.json({ data: signals });
}
