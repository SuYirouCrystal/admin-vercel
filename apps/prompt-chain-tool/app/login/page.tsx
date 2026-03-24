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
      .select("is_superadmin, is_matrix_admin")
      .eq("id", user.id)
      .maybeSingle<{ is_superadmin?: boolean | null; is_matrix_admin?: boolean | null }>();

    if (profile?.is_superadmin || profile?.is_matrix_admin) {
      redirect("/");
    }

    redirect("/unauthorized");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-5 py-10 md:px-8">
      <section className="grid w-full gap-8 rounded-[2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(10,20,35,0.16)] backdrop-blur md:grid-cols-[1.1fr_0.9fr] md:p-10">
        <div className="space-y-5">
          <p className="inline-flex rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
            Humor Flavor Prompt Chains
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-[color:var(--foreground)] md:text-5xl">
            Build the voice,
            <br />
            tune the steps,
            <br />
            test the output.
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[color:var(--muted)]">
            Create humor flavors, sequence step prompts, and test caption generation against
            your image set from one protected workspace.
          </p>
          <div className="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-5 text-sm leading-relaxed text-[color:var(--muted)]">
            This tool is intentionally locked down. Only users marked as matrix admins or
            superadmins in the
            <code className="mx-1 rounded bg-black/8 px-1 py-0.5 text-xs">profiles</code>
            table can enter.
          </div>
        </div>

        <div className="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-6 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
