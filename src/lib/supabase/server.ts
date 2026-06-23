import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getConfig, requireServerEnv } from "@/lib/config";

let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient() {
  if (serviceClient) {
    return serviceClient;
  }

  const config = getConfig();
  const url = requireServerEnv("supabaseUrl", config.supabaseUrl);
  const key = requireServerEnv("supabaseServiceRoleKey", config.supabaseServiceRoleKey);

  serviceClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return serviceClient;
}

export function hasSupabaseServerConfig() {
  const config = getConfig();
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey);
}
