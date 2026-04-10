import { redirect } from "next/navigation";

import PaginationControls from "@/components/pagination-controls";
import {
  formatValue,
  pickCreatedAt,
  pickFirstField,
  toRowArray,
  valueAsString,
} from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";
import { buildPageHref, getRangeForPage, parsePageParam, type SearchParamRecord } from "@/lib/pagination";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = Promise<SearchParamRecord>;

function displayName(profile: Record<string, unknown>): string {
  const name = valueAsString(
    pickFirstField(profile, ["full_name", "display_name", "username", "email"])
  );

  if (name) {
    return name;
  }

  return valueAsString(profile.id) || "Unknown profile";
}

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { adminClient } = await requireSuperadmin();
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageParam(resolvedSearchParams.page);
  const { from, to } = getRangeForPage(currentPage, PAGE_SIZE);

  const { data, count, error } = await adminClient
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_datetime_utc", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const profiles = toRowArray(data);
  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  if (totalItems > 0 && currentPage > totalPages) {
    redirect(buildPageHref("/admin/profiles", resolvedSearchParams, totalPages));
  }

  return (
    <main className="space-y-6 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Users and profiles (read only)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Read-only profile browsing with page controls instead of a fixed recent-only slice.
        </p>
      </header>

      <PaginationControls
        basePath="/admin/profiles"
        searchParams={resolvedSearchParams}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        itemLabel="profiles"
      />

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
                  <dd className="text-right text-slate-700">
                    {formatValue(pickCreatedAt(profile))}
                  </dd>
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

      <PaginationControls
        basePath="/admin/profiles"
        searchParams={resolvedSearchParams}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        itemLabel="profiles"
      />
    </main>
  );
}
