import Link from "next/link";

import { createPublicSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Dorm = {
  id: number;
  university_id: number | null;
  short_name: string | null;
  full_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default async function DormsListPage() {
  let dorms: Dorm[] = [];
  let error: string | null = null;

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error: queryError } = await supabase
      .from("dorms")
      .select("id, university_id, short_name, full_name, created_at, updated_at")
      .order("id", { ascending: true });

    if (queryError) {
      throw new Error(queryError.message);
    }

    dorms = (data ?? []) as Dorm[];
  } catch (unknownError) {
    error = unknownError instanceof Error ? unknownError.message : "Unable to fetch dorms.";
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
          Supabase List Page
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Dorms</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Data is loaded from the pre-existing <code>dorms</code> table in Supabase.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Back to home
          </Link>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">ID</th>
              <th className="px-4 py-3 font-semibold">Short Name</th>
              <th className="px-4 py-3 font-semibold">Full Name</th>
              <th className="px-4 py-3 font-semibold">University ID</th>
            </tr>
          </thead>
          <tbody>
            {dorms.length ? (
              dorms.map((dorm) => (
                <tr key={dorm.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 text-slate-900">{dorm.id}</td>
                  <td className="px-4 py-3 text-slate-900">{dorm.short_name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-900">{dorm.full_name ?? "-"}</td>
                  <td className="px-4 py-3 text-slate-900">{dorm.university_id ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-slate-600" colSpan={4}>
                  No rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
