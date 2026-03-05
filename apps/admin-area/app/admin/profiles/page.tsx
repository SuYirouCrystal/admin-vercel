import { formatValue, pickFirstField, toRowArray, valueAsString } from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function displayName(profile: Record<string, unknown>): string {
  const name = valueAsString(
    pickFirstField(profile, ["full_name", "display_name", "username", "email"])
  );

  if (name) {
    return name;
  }

  return valueAsString(profile.id) || "Unknown profile";
}

export default async function ProfilesPage() {
  const { adminClient } = await requireSuperadmin();

  const { data } = await adminClient
    .from("profiles")
    .select("*")
    .limit(250)
    .order("created_at", { ascending: false });

  const profiles = toRowArray(data);

  return (
    <main className="space-y-6 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Users and profiles (read only)</h2>
        <p className="mt-2 text-sm text-slate-600">
          {profiles.length} most recent profiles. Management here is intentionally read-only.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {profiles.length ? (
          profiles.map((profile) => (
            <article key={valueAsString(profile.id)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">{displayName(profile)}</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">ID</dt>
                  <dd className="max-w-[70%] truncate text-right font-mono text-xs text-slate-700">
                    {formatValue(profile.id)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Superadmin</dt>
                  <dd className="font-semibold text-slate-800">
                    {profile.is_superadmin === true ? "Yes" : "No"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Created</dt>
                  <dd className="text-right text-slate-700">{formatValue(profile.created_at)}</dd>
                </div>
              </dl>

              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  View raw profile JSON
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify(profile, null, 2)}
                </pre>
              </details>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-600">No profiles found.</p>
        )}
      </section>
    </main>
  );
}
