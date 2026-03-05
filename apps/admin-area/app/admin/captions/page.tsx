import { formatValue, pickFirstField, toRowArray, valueAsString } from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function captionText(caption: Record<string, unknown>): string {
  return (
    valueAsString(
      pickFirstField(caption, ["caption", "text", "content", "body", "value"])
    ) || "(no caption text field found)"
  );
}

export default async function CaptionsPage() {
  const { adminClient } = await requireSuperadmin();

  const { data } = await adminClient
    .from("captions")
    .select("*")
    .limit(250)
    .order("created_at", { ascending: false });

  const captions = toRowArray(data);

  return (
    <main className="space-y-6 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Captions (read only)</h2>
        <p className="mt-2 text-sm text-slate-600">{captions.length} recent caption records.</p>
      </header>

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
                  <dd className="text-xs text-slate-800">{formatValue(caption.created_at)}</dd>
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
    </main>
  );
}
