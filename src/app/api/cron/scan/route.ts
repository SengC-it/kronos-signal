import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { callWorker } from "@/lib/worker";

function authorized(request: NextRequest) {
  const secret = getConfig().cronSecret;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

function csv(value: string | undefined, fallback: string[]) {
  if (!value) {
    return fallback;
  }

  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
}

export async function GET(request: NextRequest) {
  const config = getConfig();
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await callWorker({
    path: "/scan",
    body: {
      symbols: csv(config.scanSymbols, ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]),
      timeframes: csv(config.scanTimeframes, ["15m", "1h", "4h"]),
      market_types: csv(config.scanMarketTypes, ["SPOT", "FUTURES"]),
      limit: config.scanLimit ?? 400,
    },
    timeoutMs: config.scanTimeoutMs ?? 55_000,
  });

  return NextResponse.json(result);
}
