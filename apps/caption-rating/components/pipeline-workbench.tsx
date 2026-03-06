"use client";

import { useMemo, useState } from "react";

type CaptionRecord = Record<string, unknown>;

type PresignResponse = {
  presignedUrl: string;
  cdnUrl: string;
};

type RegisterResponse = {
  imageId: string;
  now?: number;
};

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
]);

const PIPELINE_BASE_URL =
  process.env.NEXT_PUBLIC_PIPELINE_API_BASE_URL ?? "https://api.almostcrackd.ai";

function asErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected request failure.";
}

async function parseError(response: Response): Promise<string> {
  const rawText = await response.text();
  if (!rawText) {
    return `Request failed with status ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const msg = parsed.message ?? parsed.error ?? parsed.details;
    if (typeof msg === "string" && msg.trim()) {
      return msg;
    }
  } catch {
    // Ignore JSON parse failure and fall back to raw body text.
  }

  return rawText;
}

function captionText(record: CaptionRecord): string {
  const fields = [
    record.caption,
    record.text,
    record.content,
    record.generated_caption,
    record.candidate_caption,
  ];

  for (const value of fields) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "(caption text field not detected)";
}

function recordId(record: CaptionRecord): string {
  const value = record.id;
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return "-";
}

export default function PipelineWorkbench() {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState("Idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cdnUrl, setCdnUrl] = useState<string | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [captions, setCaptions] = useState<CaptionRecord[]>([]);

  const canSubmit = useMemo(() => {
    return Boolean(token.trim() && file && !isSubmitting);
  }, [token, file, isSubmitting]);

  async function postWithAuth(pathname: string, body: Record<string, unknown>) {
    const response = await fetch(`${PIPELINE_BASE_URL}${pathname}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return (await response.json()) as unknown;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    if (!token.trim()) {
      setError("Paste a valid JWT access token first.");
      return;
    }

    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setError(
        `Unsupported file type: ${file.type || "unknown"}. Use jpeg, png, webp, gif, or heic.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);
    setCdnUrl(null);
    setImageId(null);
    setCaptions([]);

    try {
      setCurrentStep("Step 1/4: Generating presigned upload URL");
      const presign = (await postWithAuth("/pipeline/generate-presigned-url", {
        contentType: file.type,
      })) as PresignResponse;

      if (!presign.presignedUrl || !presign.cdnUrl) {
        throw new Error("Presigned URL response is missing required fields.");
      }

      setCurrentStep("Step 2/4: Uploading image bytes to storage");
      const uploadResponse = await fetch(presign.presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(await parseError(uploadResponse));
      }

      setCurrentStep("Step 3/4: Registering uploaded image in pipeline");
      const registerResponse = (await postWithAuth("/pipeline/upload-image-from-url", {
        imageUrl: presign.cdnUrl,
        isCommonUse: false,
      })) as RegisterResponse;

      if (!registerResponse.imageId) {
        throw new Error("Image registration did not return imageId.");
      }

      setCurrentStep("Step 4/4: Generating captions from image");
      const generated = await postWithAuth("/pipeline/generate-captions", {
        imageId: registerResponse.imageId,
      });

      const nextCaptions = Array.isArray(generated)
        ? (generated as CaptionRecord[])
        : [generated as CaptionRecord];

      setCdnUrl(presign.cdnUrl);
      setImageId(registerResponse.imageId);
      setCaptions(nextCaptions);
      setSuccess("Caption pipeline completed successfully.");
      setCurrentStep("Done");
    } catch (unknownError) {
      setError(asErrorMessage(unknownError));
      setCurrentStep("Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-xl font-semibold text-slate-900">Upload Image and Generate Captions</h2>
        <p className="mt-2 text-sm text-slate-600">
          This follows the required 4-step pipeline against
          <code className="mx-1 rounded bg-slate-100 px-1 py-0.5 text-xs">https://api.almostcrackd.ai</code>.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-900">JWT Access Token</span>
            <textarea
              required
              value={token}
              onChange={(event) => setToken(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900"
              placeholder="Paste: eyJhbGciOi..."
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-slate-900">Image File</span>
            <input
              required
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900"
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-indigo-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Running pipeline..." : "Generate captions"}
          </button>
        </form>

        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Current status: <strong>{currentStep}</strong>
        </p>

        {error ? (
          <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Pipeline Output</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="font-medium text-slate-600">Image ID</dt>
              <dd className="font-mono text-xs text-slate-900">{imageId ?? "-"}</dd>
            </div>
            <div>
              <dt className="font-medium text-slate-600">CDN URL</dt>
              <dd className="break-all font-mono text-xs text-slate-900">{cdnUrl ?? "-"}</dd>
            </div>
          </dl>
        </article>

        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Allowed File Types</h3>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {Array.from(SUPPORTED_IMAGE_TYPES).map((type) => (
              <li key={type} className="font-mono text-xs">
                {type}
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Generated Captions</h3>
        <p className="mt-1 text-sm text-slate-600">{captions.length} records returned.</p>

        <div className="mt-4 space-y-3">
          {captions.length ? (
            captions.map((caption, index) => (
              <article
                key={recordId(caption) === "-" ? `caption-${index}` : recordId(caption)}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-900">{captionText(caption)}</p>
                <p className="mt-1 text-xs text-slate-600">ID: {recordId(caption)}</p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-slate-700">
                    Raw response JSON
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                    {JSON.stringify(caption, null, 2)}
                  </pre>
                </details>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-600">No captions generated yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
