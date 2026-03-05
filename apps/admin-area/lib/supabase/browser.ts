import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseEnv } from "@/lib/env";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createBrowserSupabaseClient() {
  if (client) {
    return client;
  }

  const { url, anonKey } = getPublicSupabaseEnv();
  client = createBrowserClient(url, anonKey);
  return client;
}
