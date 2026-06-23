type RuntimeConfig = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
  cronSecret?: string;
  workerApiUrl?: string;
  workerApiKey?: string;
  kronosApiUrl?: string;
  kronosApiKey?: string;
  redisUrl?: string;
  redisToken?: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  mailFrom?: string;
  mailTo?: string;
};

function optional(name: string) {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

export function getConfig(): RuntimeConfig {
  const smtpPort = optional("SMTP_PORT");

  return {
    supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
    cronSecret: optional("CRON_SECRET"),
    workerApiUrl: optional("WORKER_API_URL"),
    workerApiKey: optional("WORKER_API_KEY"),
    kronosApiUrl: optional("KRONOS_API_URL"),
    kronosApiKey: optional("KRONOS_API_KEY"),
    redisUrl: optional("UPSTASH_REDIS_REST_URL"),
    redisToken: optional("UPSTASH_REDIS_REST_TOKEN"),
    resendApiKey: optional("RESEND_API_KEY"),
    smtpHost: optional("SMTP_HOST"),
    smtpPort: smtpPort ? Number(smtpPort) : undefined,
    smtpUser: optional("SMTP_USER"),
    smtpPass: optional("SMTP_PASS"),
    mailFrom: optional("MAIL_FROM"),
    mailTo: optional("MAIL_TO"),
  };
}

export function requireServerEnv(name: keyof RuntimeConfig, value?: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${String(name)}`);
  }

  return value;
}

export function isConfigured(...values: Array<string | number | undefined>) {
  return values.every((value) => value !== undefined && String(value).length > 0);
}
