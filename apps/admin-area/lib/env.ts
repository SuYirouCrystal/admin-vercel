function readEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to your Vercel project and local .env.local.`
    );
  }
  return value;
}

export function getPublicSupabaseEnv() {
  return {
    // Next.js only exposes NEXT_PUBLIC_* env vars to client bundles when they are
    // referenced statically, not through process.env[name] lookups.
    url: readEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    anonKey: readEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  };
}

export function getServiceRoleSupabaseEnv() {
  return {
    url: readEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL
    ),
    serviceRoleKey: readEnv(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ),
  };
}
