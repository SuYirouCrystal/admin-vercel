import { redirect } from "next/navigation";

import LoginForm from "@/components/login-form";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const adminClient = createAdminSupabaseClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("is_superadmin")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.is_superadmin) {
      redirect("/admin");
    }

    redirect("/unauthorized");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-10">
      <section className="grid w-full gap-8 rounded-3xl border border-slate-200/70 bg-[var(--surface)] p-7 shadow-[0_20px_60px_rgba(16,35,50,0.12)] md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div className="space-y-5">
          <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold tracking-wide text-amber-900 uppercase">
            Protected admin entry
          </p>
          <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
            Sign in to the
            <br />
            Superadmin Control Center
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[var(--muted)]">
            Every admin route is gated. Access is granted only when your profile row has
            <code className="mx-1 rounded bg-slate-200 px-1 py-0.5 text-xs">is_superadmin = true</code>.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            If this is your first login, use the one-time bootstrap step in the README to flag your
            profile as a superadmin without changing any RLS policies.
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
