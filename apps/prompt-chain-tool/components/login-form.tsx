"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

function resolveNextPath(nextPath: string | null) {
  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  return nextPath;
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createBrowserSupabaseClient();
      const nextPath = resolveNextPath(searchParams.get("next"));
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (signInError) {
        setError(signInError.message);
      }
    } catch (unknownError) {
      setError(
        unknownError instanceof Error
          ? unknownError.message
          : "Unable to start Google sign-in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const queryError = searchParams.get("error");

  return (
    <div className="space-y-5">
      <p className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--surface-muted)] px-4 py-3 text-sm text-[color:var(--muted)]">
        Access is limited to users whose profile row has
        <code className="mx-1 rounded bg-black/8 px-1 py-0.5 text-xs">
          is_superadmin = true
        </code>
        or
        <code className="mx-1 rounded bg-black/8 px-1 py-0.5 text-xs">
          is_matrix_admin = true
        </code>
        .
      </p>

      {error ? (
        <p className="rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {queryError ? (
        <p className="rounded-2xl border border-rose-300/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-200">
          {queryError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={isSubmitting}
        className="w-full rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-[color:var(--accent-contrast)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Redirecting..." : "Continue with Google"}
      </button>
    </div>
  );
}
