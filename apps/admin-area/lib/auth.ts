import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import type { Row } from "@/lib/data-helpers";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SuperadminContext = {
  user: User;
  profile: Row;
  adminClient: ReturnType<typeof createAdminSupabaseClient>;
};

export async function requireSuperadmin(): Promise<SuperadminContext> {
  const sessionClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminSupabaseClient();
  const { data: profile, error } = await adminClient
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.is_superadmin !== true) {
    redirect("/unauthorized");
  }

  return {
    user,
    profile,
    adminClient,
  };
}
