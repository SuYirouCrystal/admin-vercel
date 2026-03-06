import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-5 py-10 md:px-8">
      <section className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
          Assignment #2
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
          Next.js + Supabase list page
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 md:text-base">
          This app reads from Supabase using environment variables and renders rows from a
          pre-existing table on a dedicated list page.
        </p>

        <div className="mt-6">
          <Link
            href="/list"
            className="inline-flex rounded-xl bg-indigo-700 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            View dorm list
          </Link>
        </div>
      </section>
    </main>
  );
}
