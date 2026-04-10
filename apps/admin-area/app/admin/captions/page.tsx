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

const PAGE_SIZE = 40;

type SearchParams = Promise<SearchParamRecord>;

function captionText(caption: Record<string, unknown>): string {
  return (
    valueAsString(
      pickFirstField(caption, ["caption", "text", "content", "body", "value"])
    ) || "(no caption text field found)"
  );
}

export default async function CaptionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { adminClient } = await requireSuperadmin();
  const resolvedSearchParams = await searchParams;
  const currentPage = parsePageParam(resolvedSearchParams.page);
  const { from, to } = getRangeForPage(currentPage, PAGE_SIZE);

  const { data, count, error } = await adminClient
    .from("captions")
    .select("*", { count: "exact" })
    .order("created_datetime_utc", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const captions = toRowArray(data);
  const totalItems = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  if (totalItems > 0 && currentPage > totalPages) {
    redirect(buildPageHref("/admin/captions", resolvedSearchParams, totalPages));
  }

  return (
    <main className="space-y-6 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Captions (read only)</h2>
        <p className="mt-2 text-sm text-slate-600">
          Browse recent caption records with real pagination instead of a fixed cutoff.
        </p>
      </header>

      <PaginationControls
        basePath="/admin/captions"
        searchParams={resolvedSearchParams}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        itemLabel="captions"
      />

      <section className="space-y-4">
        {captions.length ? (
          captions.map((caption) => (
            <article
              key={valueAsString(caption.id) || JSON.stringify(caption)}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-base font-semibold text-slate-900">{captionText(caption)}</p>

              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500 uppercase">Caption ID</dt>
                  <dd className="font-mono text-xs text-slate-800">{formatValue(caption.id)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500 uppercase">Image ID</dt>
                  <dd className="font-mono text-xs text-slate-800">
                    {formatValue(pickFirstField(caption, ["image_id", "photo_id", "asset_id"]))}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500 uppercase">Author/User</dt>
                  <dd className="font-mono text-xs text-slate-800">
                    {formatValue(pickFirstField(caption, ["user_id", "profile_id", "author_id"]))}
                  </dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-xs text-slate-500 uppercase">Created</dt>
                  <dd className="text-xs text-slate-800">{formatValue(pickCreatedAt(caption))}</dd>
                </div>
              </dl>

              <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                  View raw caption JSON
                </summary>
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                  {JSON.stringify(caption, null, 2)}
                </pre>
              </details>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-600">No captions found.</p>
        )}
      </section>

      <PaginationControls
        basePath="/admin/captions"
        searchParams={resolvedSearchParams}
        currentPage={currentPage}
        pageSize={PAGE_SIZE}
        totalItems={totalItems}
        itemLabel="captions"
      />
    </main>
  );
}
