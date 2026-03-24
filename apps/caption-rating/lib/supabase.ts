import { createClient } from "@supabase/supabase-js";

let client: ReturnType<typeof createClient> | null = null;

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function createPublicSupabaseClient() {
  if (client) {
    return client;
  }

  client = createClient(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );

  return client;
}
