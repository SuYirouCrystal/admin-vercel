import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-5 py-10">
      <section className="w-full rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center shadow-[0_20px_60px_rgba(16,35,50,0.12)]">
        <p className="mb-3 text-xs font-semibold tracking-wide text-rose-700 uppercase">
          Access denied
        </p>
        <h1 className="text-3xl font-bold text-rose-900">Superadmin privileges required</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-rose-800">
          Your account is authenticated, but your profile is not marked as a superadmin.
          Request access from an existing superadmin.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
          >
            Back to login
          </Link>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
