const REQUIRED_PUBLIC_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to your Vercel project and local .env.local.`
    );
  }
  return value;
}

export function getPublicSupabaseEnv() {
  const [urlName, anonName] = REQUIRED_PUBLIC_ENV;

  return {
    url: readEnv(urlName),
    anonKey: readEnv(anonName),
  };
}

export function getServerSupabaseEnv() {
  return {
    ...getPublicSupabaseEnv(),
    serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
