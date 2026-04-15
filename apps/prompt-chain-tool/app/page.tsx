import Link from "next/link";

import TestLab from "@/components/test-lab";
import ThemeToggle from "@/components/theme-toggle";
import {
  createFlavorAction,
  createStepAction,
  deleteFlavorAction,
  deleteStepAction,
  duplicateFlavorAction,
  moveStepAction,
  updateFlavorAction,
  updateStepAction,
} from "@/app/actions";
import { profileDisplayName, requireFlavorAdmin } from "@/lib/auth";
import {
  fetchPromptChainRows,
  getPromptChainSchema,
  listRecentCaptions,
} from "@/lib/schema";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type CaptionRow = {
  id: string;
  content: string | null;
  createdAt: string | null;
  imageId: string | null;
};

function asIdString(value: string | number | null | undefined) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return "";
}

function asQueryValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

function asDatabaseKey(value: string | number) {
  const rawValue = `${value}`;

  if (/^-?\d+$/.test(rawValue)) {
    const parsed = Number(rawValue);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return rawValue;
}

function captionPreview(content: string | null) {
  if (!content?.trim()) {
    return "(empty caption)";
  }

  return content;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { adminClient, profile, user } = await requireFlavorAdmin();
  const schema = await getPromptChainSchema(adminClient);
  const { flavors, steps, images } = await fetchPromptChainRows(adminClient, schema);
  const commonUseImages = images.filter((image) => image.isCommonUse);
  const availableImages = commonUseImages.length ? commonUseImages : images;

  const resolvedSearchParams = await searchParams;
  const selectedFlavorId =
    asQueryValue(resolvedSearchParams.flavor) ?? asIdString(flavors[0]?.id);
  const success = asQueryValue(resolvedSearchParams.success);
  const error = asQueryValue(resolvedSearchParams.error);

  const stepCounts = new Map<string, number>();
  for (const step of steps) {
    const key = asIdString(step.flavorId);
    stepCounts.set(key, (stepCounts.get(key) ?? 0) + 1);
  }

  const selectedFlavor =
    flavors.find((flavor) => asIdString(flavor.id) === selectedFlavorId) ?? null;

  const selectedSteps = steps
    .filter((step) => asIdString(step.flavorId) === selectedFlavorId)
    .sort((left, right) => (left.stepOrder ?? 0) - (right.stepOrder ?? 0));

  let recentCaptions: CaptionRow[] = [];
  if (selectedFlavor) {
    recentCaptions = await listRecentCaptions(adminClient, schema, asDatabaseKey(selectedFlavor.id));
  }

  const totalStepCount = steps.length;
  const averageSteps = flavors.length
    ? (totalStepCount / flavors.length).toFixed(1)
    : "0.0";

  return (
    <main className="mx-auto w-full max-w-[1500px] px-5 py-6 md:px-8 md:py-8">
      <header className="rounded-[2.2rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(10,20,35,0.16)] md:p-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--accent)]">
              Prompt Chain Tool
            </p>
            <h1 className="text-4xl font-semibold text-[color:var(--foreground)] md:text-5xl">
              Flavor Matrix
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-[color:var(--muted)] md:text-base">
              Shape the humor flavor, tune the ordered prompt steps, and test the caption
              pipeline against your image set without leaving one screen.
            </p>
          </div>

          <div className="flex flex-col items-start gap-4 xl:items-end">
            <ThemeToggle />
            <div className="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
              Signed in as
              <strong className="ml-1 text-[color:var(--foreground)]">
                {profileDisplayName(profile, user.email ?? "matrix admin")}
              </strong>
            </div>
            <form action="/logout" method="post">
              <button
                type="submit"
                className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Humor flavors
            </p>
            <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
              {flavors.length}
            </p>
          </article>
          <article className="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Total steps
            </p>
            <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
              {totalStepCount}
            </p>
          </article>
          <article className="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Avg steps / flavor
            </p>
            <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
              {averageSteps}
            </p>
          </article>
          <article className="rounded-[1.6rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted)]">
              Test images
            </p>
            <p className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
              {availableImages.length}
            </p>
          </article>
        </section>
      </header>

      {success ? (
        <p className="mt-5 rounded-[1.4rem] border border-emerald-300/60 bg-[color:var(--success-soft)] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      {error ? (
        <p className="mt-5 rounded-[1.4rem] border border-rose-300/60 bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      <section className="mt-6 grid gap-6 xl:grid-cols-[320px,minmax(0,1fr),390px]">
        <aside className="space-y-5">
          <section className="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
              Create flavor
            </p>
            <form action={createFlavorAction} className="mt-4 space-y-3">
              <label className="block space-y-2 text-sm">
                <span className="font-semibold text-[color:var(--foreground)]">Name</span>
                <input
                  name="name"
                  required
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-3 py-2 text-[color:var(--foreground)]"
                  placeholder="Deadpan escalation"
                />
              </label>
              <label className="block space-y-2 text-sm">
                <span className="font-semibold text-[color:var(--foreground)]">Description</span>
                <textarea
                  name="description"
                  rows={4}
                  className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-3 py-2 text-[color:var(--foreground)]"
                  placeholder="What kind of humor should this chain aim for?"
                />
              </label>
              <button
                type="submit"
                className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-contrast)] transition hover:brightness-110"
              >
                Create humor flavor
              </button>
            </form>
          </section>

          <section className="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--secondary)]">
                  Flavor list
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  Pick a chain to edit or test.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {flavors.length ? (
                flavors.map((flavor) => {
                  const flavorKey = asIdString(flavor.id);
                  const isActive = flavorKey === selectedFlavorId;

                  return (
                    <Link
                      key={flavorKey}
                      href={`/?flavor=${encodeURIComponent(flavorKey)}`}
                      className={`block rounded-[1.3rem] border p-4 transition ${
                        isActive
                          ? "border-[color:var(--accent)] bg-[color:var(--accent-soft)]"
                          : "border-[color:var(--line)] bg-[color:var(--surface-muted)] hover:border-[color:var(--secondary)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
                          {flavor.name}
                        </h2>
                        <span className="rounded-full bg-black/8 px-2 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                          {stepCounts.get(flavorKey) ?? 0} steps
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
                        {flavor.description?.trim() || "No description yet."}
                      </p>
                    </Link>
                  );
                })
              ) : (
                <p className="rounded-[1.3rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-5 text-sm text-[color:var(--muted)]">
                  No humor flavors yet. Create the first one to start the chain.
                </p>
              )}
            </div>
          </section>
        </aside>

        <section className="space-y-5">
          {selectedFlavor ? (
            <>
              <section className="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
                      Flavor editor
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">
                      {selectedFlavor.name}
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={duplicateFlavorAction}>
                      <input type="hidden" name="flavorId" value={asIdString(selectedFlavor.id)} />
                      <button
                        type="submit"
                        className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-2 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--secondary)]"
                      >
                        Duplicate flavor
                      </button>
                    </form>

                    <form action={deleteFlavorAction}>
                      <input type="hidden" name="flavorId" value={asIdString(selectedFlavor.id)} />
                      <button
                        type="submit"
                        className="rounded-2xl border border-rose-300/60 bg-[color:var(--danger-soft)] px-4 py-2 text-sm font-semibold text-rose-700 transition hover:brightness-105 dark:text-rose-200"
                      >
                        Delete flavor
                      </button>
                    </form>
                  </div>
                </div>

                <form action={updateFlavorAction} className="mt-5 grid gap-4">
                  <input type="hidden" name="flavorId" value={asIdString(selectedFlavor.id)} />
                  <label className="block space-y-2 text-sm">
                    <span className="font-semibold text-[color:var(--foreground)]">Name</span>
                    <input
                      name="name"
                      required
                      defaultValue={selectedFlavor.name}
                      className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-3 py-2 text-[color:var(--foreground)]"
                    />
                  </label>
                  <label className="block space-y-2 text-sm">
                    <span className="font-semibold text-[color:var(--foreground)]">Description</span>
                    <textarea
                      name="description"
                      rows={4}
                      defaultValue={selectedFlavor.description ?? ""}
                      className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-3 py-2 text-[color:var(--foreground)]"
                    />
                  </label>
                  <button
                    type="submit"
                    className="justify-self-start rounded-2xl bg-[color:var(--secondary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                  >
                    Save flavor
                  </button>
                </form>
              </section>

              <section className="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--secondary)]">
                      Ordered steps
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                      Prompt chain
                    </h2>
                  </div>

                  <span className="rounded-full bg-black/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                    {selectedSteps.length} steps
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {selectedSteps.length ? (
                    selectedSteps.map((step, index) => (
                      <article
                        key={asIdString(step.id)}
                        className="rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                            Step {step.stepOrder ?? index + 1}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <form action={moveStepAction}>
                              <input
                                type="hidden"
                                name="flavorId"
                                value={asIdString(selectedFlavor.id)}
                              />
                              <input type="hidden" name="stepId" value={asIdString(step.id)} />
                              <input type="hidden" name="direction" value="up" />
                              <button
                                type="submit"
                                disabled={index === 0}
                                className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)] transition hover:border-[color:var(--secondary)] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Move up
                              </button>
                            </form>
                            <form action={moveStepAction}>
                              <input
                                type="hidden"
                                name="flavorId"
                                value={asIdString(selectedFlavor.id)}
                              />
                              <input type="hidden" name="stepId" value={asIdString(step.id)} />
                              <input type="hidden" name="direction" value="down" />
                              <button
                                type="submit"
                                disabled={index === selectedSteps.length - 1}
                                className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--foreground)] transition hover:border-[color:var(--secondary)] disabled:cursor-not-allowed disabled:opacity-45"
                              >
                                Move down
                              </button>
                            </form>
                          </div>
                        </div>

                        <form action={updateStepAction} className="mt-3 space-y-3">
                          <input type="hidden" name="flavorId" value={asIdString(selectedFlavor.id)} />
                          <input type="hidden" name="stepId" value={asIdString(step.id)} />
                          <textarea
                            name="promptText"
                            rows={4}
                            defaultValue={step.promptText}
                            className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--foreground)]"
                          />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              className="rounded-2xl bg-[color:var(--secondary)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                            >
                              Save step
                            </button>
                          </div>
                        </form>

                        <form action={deleteStepAction} className="mt-3">
                          <input type="hidden" name="flavorId" value={asIdString(selectedFlavor.id)} />
                          <input type="hidden" name="stepId" value={asIdString(step.id)} />
                          <button
                            type="submit"
                            className="rounded-2xl border border-rose-300/60 bg-[color:var(--danger-soft)] px-4 py-2 text-sm font-semibold text-rose-700 transition hover:brightness-105 dark:text-rose-200"
                          >
                            Delete step
                          </button>
                        </form>
                      </article>
                    ))
                  ) : (
                    <p className="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-5 text-sm text-[color:var(--muted)]">
                      This humor flavor has no steps yet. Start by writing the first stage of the
                      chain.
                    </p>
                  )}
                </div>

                <form action={createStepAction} className="mt-5 rounded-[1.5rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
                  <input type="hidden" name="flavorId" value={asIdString(selectedFlavor.id)} />
                  <label className="block space-y-2 text-sm">
                    <span className="font-semibold text-[color:var(--foreground)]">Add step prompt</span>
                    <textarea
                      name="promptText"
                      required
                      rows={4}
                      className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface)] px-3 py-2 text-[color:var(--foreground)]"
                      placeholder="Use the previous step output and sharpen the joke angle..."
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-3 rounded-2xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-[color:var(--accent-contrast)] transition hover:brightness-110"
                  >
                    Create step
                  </button>
                </form>
              </section>
            </>
          ) : (
            <section className="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-8 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
                No flavor selected
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-[color:var(--foreground)]">
                Create your first humor flavor
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--muted)]">
                The editor and test lab unlock after you create a flavor. Start with a name,
                describe the tone, then add ordered steps that define how the chain transforms an
                image into captions.
              </p>
            </section>
          )}
        </section>

        <aside className="space-y-5">
          <TestLab
            flavorId={selectedFlavor ? asIdString(selectedFlavor.id) : null}
            flavorName={selectedFlavor?.name ?? null}
            steps={selectedSteps.map((step) => ({
              id: asIdString(step.id),
              step_order: step.stepOrder ?? 0,
              prompt_text: step.promptText,
            }))}
            images={availableImages.map((image) => ({
              id: image.id,
              url: image.url,
              image_description: image.imageDescription,
              is_common_use: image.isCommonUse,
            }))}
          />

          <section className="rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--secondary)]">
                  Flavor output
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                  Recent saved captions
                </h2>
              </div>
              {selectedFlavor ? (
                <span className="rounded-full bg-black/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--muted)]">
                  {recentCaptions.length} rows
                </span>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              {selectedFlavor ? (
                recentCaptions.length ? (
                  recentCaptions.map((caption) => (
                    <article
                      key={caption.id}
                      className="rounded-[1.3rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4"
                    >
                      <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
                        {captionPreview(caption.content)}
                      </p>
                      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        Image {caption.imageId ?? "unknown"} · {caption.createdAt ?? "n/a"}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-[1.3rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-5 text-sm text-[color:var(--muted)]">
                    No saved captions yet for this humor flavor.
                  </p>
                )
              ) : (
                <p className="rounded-[1.3rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-5 text-sm text-[color:var(--muted)]">
                  Select a humor flavor to inspect its saved captions.
                </p>
              )}
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
