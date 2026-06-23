import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { getConfig, requireServerEnv } from "@/lib/config";

export async function createSupabaseAuthClient() {
  const config = getConfig();
  const cookieStore = await cookies();

  return createServerClient(
    requireServerEnv("supabaseUrl", config.supabaseUrl),
    requireServerEnv("supabaseAnonKey", config.supabaseAnonKey),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot always write refreshed auth cookies.
          }
        },
      },
    },
  );
}

export async function requireOperator() {
  const config = getConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  const supabase = await createSupabaseAuthClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return data.user;
}

export async function getOperatorUser() {
  const config = getConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return null;
  }

  const supabase = await createSupabaseAuthClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
