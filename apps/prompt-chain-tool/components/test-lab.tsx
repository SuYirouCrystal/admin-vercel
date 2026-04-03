"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type TestImage = {
  id: string;
  url: string | null;
  image_description: string | null;
  is_common_use: boolean | null;
};

type StepPreview = {
  id: string;
  step_order: number;
  prompt_text: string;
};

type CaptionRecord = Record<string, unknown>;

type Props = {
  flavorId: string | null;
  flavorName: string | null;
  steps: StepPreview[];
  images: TestImage[];
};

const PIPELINE_BASE_URL =
  process.env.NEXT_PUBLIC_PIPELINE_API_BASE_URL ?? "https://api.almostcrackd.ai";

function extractBalancedJson(rawText: string) {
  const startIndex = rawText.search(/[\[{]/);
  if (startIndex === -1) {
    return null;
  }

  const stack: string[] = [];
  let inString = false;
  let isEscaped = false;

  for (let index = startIndex; index < rawText.length; index += 1) {
    const char = rawText[index];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
        continue;
      }

      if (char === "\\") {
        isEscaped = true;
        continue;
      }

      if (char === "\"") {
        inString = false;
      }

      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const expected = char === "}" ? "{" : "[";
      const last = stack.pop();

      if (last !== expected) {
        return null;
      }

      if (stack.length === 0) {
        return rawText.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function parseLooseJson(rawText: string): unknown {
  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    const extracted = extractBalancedJson(rawText);
    if (!extracted) {
      throw new Error("Response did not contain valid JSON.");
    }

    return JSON.parse(extracted) as unknown;
  }
}

function captionText(record: CaptionRecord) {
  const candidates = [
    record.content,
    record.caption,
    record.text,
    record.generated_caption,
    record.candidate_caption,
    record.body,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "(caption text not detected)";
}

function recordId(record: CaptionRecord) {
  const value = record.id;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  return "generated";
}

function imageLabel(image: TestImage) {
  if (image.image_description?.trim()) {
    return image.image_description.slice(0, 88);
  }

  return image.id;
}

async function parseError(response: Response) {
  const rawText = await response.text();

  if (!rawText) {
    return `Request failed with status ${response.status}.`;
  }

  try {
    const parsed = parseLooseJson(rawText) as Record<string, unknown>;
    const detail = parsed.message ?? parsed.error ?? parsed.details;

    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
  } catch {
    // Ignore parse failure and fall back to raw text.
  }

  return rawText;
}

function coerceFlavorKey(flavorId: string) {
  if (/^-?\d+$/.test(flavorId)) {
    const parsed = Number(flavorId);
    if (Number.isSafeInteger(parsed)) {
      return parsed;
    }
  }

  return flavorId;
}

export default function TestLab({ flavorId, flavorName, steps, images }: Props) {
  const router = useRouter();

  const [selectedImageId, setSelectedImageId] = useState(images[0]?.id ?? "");
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setSelectedImageId((current) =>
      images.some((image) => image.id === current) ? current : (images[0]?.id ?? "")
    );
  }, [images]);

  useEffect(() => {
    setCaptions([]);
    setError(null);
    setSuccess(null);
    setStatus("Idle");
  }, [flavorId]);

  async function attemptGenerateCaptions(accessToken: string) {
    if (!flavorId) {
      throw new Error("Select a humor flavor before running the test lab.");
    }

    if (!selectedImageId) {
      throw new Error("Choose an image from the test set first.");
    }

    const flavorKey = coerceFlavorKey(flavorId);
    const requestBodies = [
      { imageId: selectedImageId, humorFlavorId: flavorKey },
      { imageId: selectedImageId, humor_flavor_id: flavorKey },
      { image_id: selectedImageId, humorFlavorId: flavorKey },
      { image_id: selectedImageId, humor_flavor_id: flavorKey },
    ];

    let lastError = "Caption generation failed.";

    for (const body of requestBodies) {
      const response = await fetch(`${PIPELINE_BASE_URL}/pipeline/generate-captions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const payload = parseLooseJson(await response.text());
        return Array.isArray(payload)
          ? (payload as CaptionRecord[])
          : [payload as CaptionRecord];
      }

      lastError = await parseError(response);

      if (![400, 404, 422].includes(response.status)) {
        break;
      }
    }

    throw new Error(lastError);
  }

  async function handleGenerate() {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setCaptions([]);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No active session token found. Sign in again and retry.");
      }

      setStatus("Running prompt chain");
      const nextCaptions = await attemptGenerateCaptions(session.access_token);

      setCaptions(nextCaptions);
      setSuccess("Caption generation finished. Recent history is refreshing.");
      setStatus("Done");

      startTransition(() => {
        router.refresh();
      });
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to generate captions right now."
      );
      setStatus("Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedImage = images.find((image) => image.id === selectedImageId) ?? null;

  return (
    <section className="space-y-4 rounded-[1.8rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-5 shadow-[0_16px_40px_rgba(10,20,35,0.12)]">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--secondary)]">
          Test Lab
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
          Run a flavor against the image set
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[color:var(--muted)]">
          The selected humor flavor is passed into the caption pipeline, then the latest saved
          captions are refreshed below.
        </p>
      </header>

      <div className="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Selected flavor
        </p>
        <p className="mt-2 text-lg font-semibold text-[color:var(--foreground)]">
          {flavorName ?? "Choose a flavor first"}
        </p>
      </div>

      <label className="block space-y-2 text-sm">
        <span className="font-semibold text-[color:var(--foreground)]">Test image</span>
        <select
          value={selectedImageId}
          onChange={(event) => setSelectedImageId(event.target.value)}
          className="w-full rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-3 py-2 text-[color:var(--foreground)]"
        >
          {images.length ? (
            images.map((image) => (
              <option key={image.id} value={image.id}>
                {imageLabel(image)}
              </option>
            ))
          ) : (
            <option value="">No images available</option>
          )}
        </select>
      </label>

      {selectedImage?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={selectedImage.url}
          alt={selectedImage.image_description ?? "Selected test image"}
          className="h-48 w-full rounded-[1.4rem] border border-[color:var(--line)] object-cover"
        />
      ) : null}

      <div className="rounded-[1.4rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Step preview
        </p>
        <div className="mt-3 space-y-3">
          {steps.length ? (
            steps.map((step) => (
              <article
                key={step.id}
                className="rounded-[1.1rem] border border-[color:var(--line)] bg-[color:var(--surface)] p-3"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent)]">
                  Step {step.step_order}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--foreground)]">
                  {step.prompt_text}
                </p>
              </article>
            ))
          ) : (
            <p className="text-sm text-[color:var(--muted)]">
              Add at least one step before testing the flavor.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!flavorId || !selectedImageId || !steps.length || isSubmitting}
        className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-[color:var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Running prompt chain..." : "Generate captions for this flavor"}
      </button>

      <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--foreground)]">
        Status: <strong>{status}</strong>
      </p>

      {error ? (
        <p className="rounded-2xl border border-rose-300/60 bg-[color:var(--danger-soft)] px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-2xl border border-emerald-300/60 bg-[color:var(--success-soft)] px-4 py-3 text-sm text-emerald-700 dark:text-emerald-200">
          {success}
        </p>
      ) : null}

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
          Latest generated response
        </p>
        {captions.length ? (
          captions.map((caption, index) => (
            <article
              key={`${recordId(caption)}-${index}`}
              className="rounded-[1.2rem] border border-[color:var(--line)] bg-[color:var(--surface-muted)] p-4"
            >
              <p className="text-sm leading-relaxed text-[color:var(--foreground)]">
                {captionText(caption)}
              </p>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                  Raw response
                </summary>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                  {JSON.stringify(caption, null, 2)}
                </pre>
              </details>
            </article>
          ))
        ) : (
          <p className="text-sm text-[color:var(--muted)]">
            No generated captions yet for this session.
          </p>
        )}
      </div>
    </section>
  );
}
