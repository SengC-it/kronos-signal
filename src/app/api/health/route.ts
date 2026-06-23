import { NextResponse } from "next/server";
import { getConfig, isConfigured } from "@/lib/config";
import { hasSupabaseServerConfig } from "@/lib/supabase/server";
import { checkWorkerHealth } from "@/lib/worker";

export async function GET() {
  const config = getConfig();
  const worker = await checkWorkerHealth();

  return NextResponse.json({
    ok: hasSupabaseServerConfig() && worker.ok,
    services: [
      {
        name: "supabase",
        ok: hasSupabaseServerConfig(),
        detail: hasSupabaseServerConfig() ? "configured" : "missing server credentials",
      },
      {
        name: "worker",
        ok: worker.ok,
        detail: worker.detail,
      },
      {
        name: "kronos",
        ok: isConfigured(config.kronosApiUrl, config.kronosApiKey),
        detail: isConfigured(config.kronosApiUrl, config.kronosApiKey) ? "configured" : "missing Kronos service config",
      },
      {
        name: "email",
        ok: Boolean(config.resendApiKey || config.smtpHost),
        detail: config.resendApiKey ? "resend configured" : config.smtpHost ? "smtp configured" : "dry-run mode",
      },
      {
        name: "redis",
        ok: isConfigured(config.redisUrl, config.redisToken),
        detail: isConfigured(config.redisUrl, config.redisToken) ? "configured" : "missing Upstash config",
      },
    ],
  });
}
