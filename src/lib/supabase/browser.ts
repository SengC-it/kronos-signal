import { createClient } from "@supabase/supabase-js";
import { getConfig, requireServerEnv } from "@/lib/config";

export function createBrowserSupabaseClient() {
  const config = getConfig();
  return createClient(
    requireServerEnv("supabaseUrl", config.supabaseUrl),
    requireServerEnv("supabaseAnonKey", config.supabaseAnonKey),
  );
}
