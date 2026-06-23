import { getConfig, requireServerEnv } from "@/lib/config";

type WorkerRequest = {
  path: string;
  body?: unknown;
  timeoutMs?: number;
};

export async function callWorker<T>({ path, body, timeoutMs = 30_000 }: WorkerRequest): Promise<T> {
  const config = getConfig();
  const baseUrl = requireServerEnv("workerApiUrl", config.workerApiUrl).replace(/\/$/, "");
  const apiKey = requireServerEnv("workerApiKey", config.workerApiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Worker ${path} failed with ${response.status}: ${text}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkWorkerHealth() {
  const config = getConfig();
  if (!config.workerApiUrl || !config.workerApiKey) {
    return { ok: false, detail: "Worker API is not configured" };
  }

  try {
    return await callWorker<{ ok: boolean; detail: string }>({
      path: "/health",
      timeoutMs: 8_000,
    });
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : "Worker health failed" };
  }
}
