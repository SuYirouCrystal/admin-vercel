"use client";

import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

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

type PresignResponse = {
  presignedUrl: string;
  cdnUrl: string;
};

type RegisterResponse = {
  imageId: string;
};

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected upload failure.";
}

async function responseError(response: Response): Promise<string> {
  const text = await response.text();
  return text || `Request failed with status ${response.status}`;
}

export default function ImageUploadPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [isCommonUse, setIsCommonUse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError("Choose an image file first.");
      return;
    }

    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setError(`Unsupported image type: ${file.type}`);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("No active session token found. Please sign in again.");
      }

      setStatus("Step 1/3: Generating presigned URL");
      const presignResponse = await fetch(`${PIPELINE_BASE_URL}/pipeline/generate-presigned-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentType: file.type }),
      });

      if (!presignResponse.ok) {
        throw new Error(await responseError(presignResponse));
      }

      const presign = (await presignResponse.json()) as PresignResponse;

      setStatus("Step 2/3: Uploading image bytes");
      const uploadResponse = await fetch(presign.presignedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(await responseError(uploadResponse));
      }

      setStatus("Step 3/3: Registering image in pipeline");
      const registerResponse = await fetch(
        `${PIPELINE_BASE_URL}/pipeline/upload-image-from-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl: presign.cdnUrl,
            isCommonUse,
          }),
        }
      );

      if (!registerResponse.ok) {
        throw new Error(await responseError(registerResponse));
      }

      const registered = (await registerResponse.json()) as RegisterResponse;
      setStatus("Done");

      const params = new URLSearchParams({
        success: `Uploaded image ${registered.imageId}`,
      });
      window.location.href = `/admin/images?${params.toString()}`;
    } catch (unknownError) {
      setError(errorMessage(unknownError));
      setStatus("Failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-indigo-900">Upload new image</h3>
      <p className="mt-2 text-sm text-indigo-700">
        Upload image bytes via the staging pipeline API, then register the image in the `images`
        table.
      </p>

      <form onSubmit={handleUpload} className="mt-4 space-y-3">
        <input
          required
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/heic"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-slate-900"
        />

        <label className="flex items-center gap-2 text-sm text-indigo-900">
          <input
            type="checkbox"
            checked={isCommonUse}
            onChange={(event) => setIsCommonUse(event.target.checked)}
          />
          Mark as common-use image
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Uploading..." : "Upload and register image"}
        </button>
      </form>

      <p className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-900">
        Status: <strong>{status}</strong>
      </p>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
    </section>
  );
}
