import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl items-center justify-center px-5 py-10">
      <section className="w-full rounded-[2rem] border border-rose-400/30 bg-[color:var(--surface)] p-8 text-center shadow-[0_24px_80px_rgba(10,20,35,0.16)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">
          Access denied
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
          Matrix admin or superadmin access required
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
          Your account is authenticated, but your profile row is not marked with either
          <code className="mx-1 rounded bg-black/8 px-1 py-0.5 text-xs">is_superadmin</code>
          or
          <code className="mx-1 rounded bg-black/8 px-1 py-0.5 text-xs">is_matrix_admin</code>
          .
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
          >
            Back to login
          </Link>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast)] transition hover:brightness-110"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
