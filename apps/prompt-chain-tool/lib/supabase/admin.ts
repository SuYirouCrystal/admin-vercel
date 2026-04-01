import { createClient } from "@supabase/supabase-js";

import { getServiceRoleSupabaseEnv } from "@/lib/env";

export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getServiceRoleSupabaseEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
