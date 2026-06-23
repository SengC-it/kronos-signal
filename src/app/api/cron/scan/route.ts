import { NextRequest, NextResponse } from "next/server";
import { getConfig } from "@/lib/config";
import { callWorker } from "@/lib/worker";

function authorized(request: NextRequest) {
  const secret = getConfig().cronSecret;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const result = await callWorker({
    path: "/scan",
    body: {
      symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"],
      timeframes: ["15m", "1h", "4h"],
      market_types: ["SPOT", "FUTURES"],
    },
    timeoutMs: 55_000,
  });

  return NextResponse.json(result);
}
