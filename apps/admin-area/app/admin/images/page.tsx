import {
  formatValue,
  pickFirstField,
  toRowArray,
  valueAsString,
  type Row,
} from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";
import ImageUploadPanel from "@/components/image-upload-panel";

import {
  createImageAction,
  deleteImageAction,
  updateImageAction,
} from "@/app/admin/images/actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const defaultCreatePayload = `{
  "user_id": "<profile-id>",
  "image_url": "https://example.com/image.jpg",
  "title": "Sunset boardwalk"
}`;

function recordId(image: Row): string {
  return valueAsString(image.id);
}

function displayTitle(image: Row): string {
  return (
    valueAsString(pickFirstField(image, ["title", "name", "filename"])) ||
    `Image ${recordId(image) || "(missing id)"}`
  );
}

function displayUrl(image: Row): string {
  return valueAsString(
    pickFirstField(image, ["image_url", "url", "public_url", "src", "storage_path"])
  );
}

function queryValue(
  params: Record<string, string | string[] | undefined>,
  key: "error" | "success"
): string | null {
  const raw = params[key];
  if (typeof raw === "string") {
    return raw;
  }

  return null;
}

export default async function ImagesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { adminClient } = await requireSuperadmin();
  const { data } = await adminClient
    .from("images")
    .select("*")
    .limit(250)
    .order("created_at", { ascending: false });

  const images = toRowArray(data);
  const resolvedSearchParams = await searchParams;
  const success = queryValue(resolvedSearchParams, "success");
  const error = queryValue(resolvedSearchParams, "error");

  return (
    <main className="space-y-6 pb-10">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Images (create, update, delete)</h2>
        <p className="mt-2 text-sm text-slate-600">
          JSON-powered editor to support custom image schemas without touching RLS policies.
        </p>
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

      <ImageUploadPanel />

      <section className="rounded-2xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-teal-900">Create image record</h3>
        <p className="mt-2 text-sm text-teal-700">
          Provide a valid JSON object that matches your `images` table columns.
        </p>
        <form action={createImageAction} className="mt-4 space-y-3">
          <textarea
            name="payload"
            defaultValue={defaultCreatePayload}
            rows={8}
            required
            className="w-full rounded-xl border border-teal-200 bg-white p-3 font-mono text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
          <button
            type="submit"
            className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
          >
            Create image
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {images.length ? (
          images.map((image) => {
            const id = recordId(image);
            const rawJson = JSON.stringify(image, null, 2);
            const url = displayUrl(image);

            return (
              <article key={id || rawJson} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{displayTitle(image)}</h3>
                    <p className="mt-1 text-sm text-slate-600">ID: {formatValue(image.id)}</p>
                    <p className="text-sm text-slate-600">Created: {formatValue(image.created_at)}</p>
                  </div>
                  {url.startsWith("http") ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={displayTitle(image)}
                      className="h-24 w-36 rounded-lg border border-slate-200 object-cover"
                    />
                  ) : null}
                </div>

                <form action={updateImageAction} className="mt-4 space-y-3">
                  <input type="hidden" name="id" value={id} />
                  <textarea
                    name="payload"
                    defaultValue={rawJson}
                    rows={10}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 font-mono text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Update image
                    </button>
                  </div>
                </form>

                <form action={deleteImageAction} className="mt-3">
                  <input type="hidden" name="id" value={id} />
                  <button
                    type="submit"
                    className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Delete image
                  </button>
                </form>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-slate-600">No images found.</p>
        )}
      </section>
    </main>
  );
}
