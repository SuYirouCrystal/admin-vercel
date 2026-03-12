import { notFound } from "next/navigation";

import {
  formatValue,
  toRowArray,
  type Row,
} from "@/lib/data-helpers";
import { getAdminResource } from "@/lib/admin-resources";
import { requireSuperadmin } from "@/lib/auth";

import {
  createResourceRecordAction,
  deleteResourceRecordAction,
  updateResourceRecordAction,
} from "@/app/admin/resources/actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ resource: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type PrimaryKey = {
  column: string;
  value: string;
};

const PRIMARY_KEY_CANDIDATES = [
  "id",
  "uuid",
  "email",
  "domain",
  "name",
  "key",
  "slug",
  "term",
  "code",
];

function findPrimaryKey(row: Row): PrimaryKey | null {
  for (const column of PRIMARY_KEY_CANDIDATES) {
    if (!(column in row)) {
      continue;
    }

    const value = row[column];
    if (typeof value === "string" || typeof value === "number") {
      return {
        column,
        value: String(value),
      };
    }
  }

  return null;
}

function buildDefaultCreatePayload(firstRow: Row | null): string {
  if (!firstRow) {
    return JSON.stringify({ name: "example" }, null, 2);
  }

  const clone: Row = {};
  for (const [key, value] of Object.entries(firstRow)) {
    if (["id", "created_at", "updated_at"].includes(key)) {
      continue;
    }

    if (typeof value === "string") {
      clone[key] = key.includes("email") ? "example@domain.com" : "";
      continue;
    }

    if (typeof value === "number") {
      clone[key] = 0;
      continue;
    }

    if (typeof value === "boolean") {
      clone[key] = false;
      continue;
    }

    if (value === null) {
      clone[key] = null;
      continue;
    }

    clone[key] = value;
  }

  if (!Object.keys(clone).length) {
    clone.name = "example";
  }

  return JSON.stringify(clone, null, 2);
}

function queryMessage(
  params: Record<string, string | string[] | undefined>,
  key: "success" | "error"
): string | null {
  const value = params[key];
  if (typeof value === "string") {
    return value;
  }

  return null;
}

async function fetchRows(
  adminClient: Awaited<ReturnType<typeof requireSuperadmin>>["adminClient"],
  table: string
) {
  const ordered = await adminClient
    .from(table)
    .select("*")
    .limit(250)
    .order("created_at", { ascending: false });

  if (!ordered.error) {
    return toRowArray(ordered.data);
  }

  const fallback = await adminClient.from(table).select("*").limit(250);
  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return toRowArray(fallback.data);
}

export default async function ResourceManagementPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { resource: resourceSlug } = await params;
  const resource = getAdminResource(resourceSlug);

  if (!resource) {
    notFound();
  }

  const { adminClient } = await requireSuperadmin();
  const rows = await fetchRows(adminClient, resource.table);

  const resolvedSearchParams = await searchParams;
  const success = queryMessage(resolvedSearchParams, "success");
  const error = queryMessage(resolvedSearchParams, "error");
  const path = `/admin/resources/${resource.slug}`;
  const createPayload = buildDefaultCreatePayload(rows[0] ?? null);

  return (
    <main className="space-y-6 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Table: {resource.table}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-slate-900">{resource.label}</h2>
        <p className="mt-2 text-sm text-slate-600">{resource.description}</p>
      </header>

      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {resource.mode === "crud" ? (
        <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-teal-900">Create record</h3>
          <form action={createResourceRecordAction} className="mt-4 space-y-3">
            <input type="hidden" name="table" value={resource.table} />
            <input type="hidden" name="path" value={path} />
            <textarea
              name="payload"
              defaultValue={createPayload}
              rows={8}
              required
              className="w-full rounded-xl border border-teal-200 bg-white p-3 font-mono text-sm text-slate-900"
            />
            <button
              type="submit"
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
            >
              Create
            </button>
          </form>
        </section>
      ) : null}

      <section className="space-y-4">
        {rows.length ? (
          rows.map((row) => {
            const rawJson = JSON.stringify(row, null, 2);
            const primaryKey = findPrimaryKey(row);

            return (
              <article
                key={primaryKey ? `${primaryKey.column}:${primaryKey.value}` : rawJson}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    {primaryKey ? `${primaryKey.column}: ${primaryKey.value}` : "No primary key detected"}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    created_at: {formatValue(row.created_at)}
                  </span>
                </div>

                {resource.mode === "read" ? (
                  <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    {rawJson}
                  </pre>
                ) : (
                  <form action={updateResourceRecordAction} className="space-y-3">
                    <input type="hidden" name="table" value={resource.table} />
                    <input type="hidden" name="path" value={path} />
                    <input type="hidden" name="pkColumn" value={primaryKey?.column ?? ""} />
                    <input type="hidden" name="pkValue" value={primaryKey?.value ?? ""} />
                    <textarea
                      name="payload"
                      defaultValue={rawJson}
                      rows={10}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-900"
                    />

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={!primaryKey}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Update
                      </button>
                    </div>
                  </form>
                )}

                {resource.mode === "crud" ? (
                  <form action={deleteResourceRecordAction} className="mt-3">
                    <input type="hidden" name="table" value={resource.table} />
                    <input type="hidden" name="path" value={path} />
                    <input type="hidden" name="pkColumn" value={primaryKey?.column ?? ""} />
                    <input type="hidden" name="pkValue" value={primaryKey?.value ?? ""} />
                    <button
                      type="submit"
                      disabled={!primaryKey}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })
        ) : (
          <p className="text-sm text-slate-600">No records found.</p>
        )}
      </section>
    </main>
  );
}
