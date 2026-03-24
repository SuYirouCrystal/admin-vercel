import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProfileRow = {
  id: string;
  email?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  is_superadmin?: boolean | null;
  is_matrix_admin?: boolean | null;
};

export type FlavorAdminContext = {
  user: User;
  profile: ProfileRow;
  adminClient: ReturnType<typeof createAdminSupabaseClient>;
};

export function profileDisplayName(profile: ProfileRow, fallbackEmail: string) {
  const fullName = [profile.first_name, profile.last_name]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (profile.email?.trim()) {
    return profile.email;
  }

  return fallbackEmail;
}

export async function requireFlavorAdmin(): Promise<FlavorAdminContext> {
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
    .select("id, email, first_name, last_name, is_superadmin, is_matrix_admin")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  const hasAccess =
    profile?.is_superadmin === true || profile?.is_matrix_admin === true;

  if (error || !profile || !hasAccess) {
    redirect("/unauthorized");
  }

  return {
    user,
    profile,
    adminClient,
  };
}
