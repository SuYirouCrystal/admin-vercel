"use client";

import { useEffect, useMemo, useState } from "react";

import { createPublicSupabaseClient } from "@/lib/supabase";

type Row = Record<string, unknown>;

type Props = {
  initialImages: Row[];
  initialCaptions: Row[];
  initialError: string | null;
};

function toId(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return "";
}

function captionText(row: Row): string {
  const value = row.caption ?? row.text ?? row.content ?? row.body;
  if (typeof value === "string") {
    return value;
  }
  return "(no caption text field)";
}

function createdAt(row: Row): string {
  const value = row.created_datetime_utc ?? row.created_at;
  if (typeof value === "string") {
    return value;
  }
  return "-";
}

export default function CaptionWorkbench({
  initialImages,
  initialCaptions,
  initialError,
}: Props) {
  const [images, setImages] = useState(initialImages);
  const [captions, setCaptions] = useState(initialCaptions);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCaptionText, setNewCaptionText] = useState("");
  const [newCaptionImageId, setNewCaptionImageId] = useState("");
  const [ratingCaptionId, setRatingCaptionId] = useState("");
  const [ratingValue, setRatingValue] = useState("5");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const imageOptions = useMemo(
    () =>
      images.map((image) => ({
        id: toId(image.id),
        label:
          (typeof image.title === "string" && image.title) ||
          (typeof image.name === "string" && image.name) ||
          (typeof image.url === "string" && image.url) ||
          toId(image.id),
      })),
    [images]
  );

  useEffect(() => {
    const supabase = createPublicSupabaseClient();
    let isActive = true;

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) {
        return;
      }

      setCurrentUserId(user?.id ?? null);
      setCurrentUserEmail(user?.email ?? null);
      setIsAuthLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUserId(session?.user?.id ?? null);
      setCurrentUserEmail(session?.user?.email ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function refreshData() {
    const supabase = createPublicSupabaseClient();

    const [imagesResult, captionsResult] = await Promise.all([
      supabase
        .from("images")
        .select("*")
        .limit(80)
        .order("created_datetime_utc", { ascending: false }),
      supabase
        .from("captions")
        .select("*")
        .limit(120)
        .order("created_datetime_utc", { ascending: false }),
    ]);

    if (imagesResult.error) {
      throw new Error(imagesResult.error.message);
    }
    if (captionsResult.error) {
      throw new Error(captionsResult.error.message);
    }

    setImages((imagesResult.data ?? []) as Row[]);
    setCaptions((captionsResult.data ?? []) as Row[]);
  }

  async function handleCreateCaption(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!currentUserId) {
        throw new Error("Sign in with Google before creating captions.");
      }

      if (!newCaptionImageId.trim()) {
        throw new Error("Select an image before creating a caption.");
      }

      const supabase = createPublicSupabaseClient();
      const payload: Row = {
        content: newCaptionText.trim(),
        image_id: newCaptionImageId.trim(),
        profile_id: currentUserId,
        is_public: false,
        is_featured: false,
        like_count: 0,
        created_by_user_id: currentUserId,
        modified_by_user_id: currentUserId,
      };

      const { error: insertError } = await supabase
        .from("captions")
        .insert(payload as never);
      if (insertError) {
        throw new Error(insertError.message);
      }

      await refreshData();
      setNewCaptionText("");
      setNewCaptionImageId("");
      setSuccess("Caption submitted.");
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Unable to create caption.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRateCaption(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!currentUserId) {
        throw new Error("Sign in with Google before rating captions.");
      }

      const supabase = createPublicSupabaseClient();
      const captionId = ratingCaptionId.trim();
      const numericVote = Number(ratingValue);

      const { data: existingVote, error: existingVoteError } = await supabase
        .from("caption_votes")
        .select("id")
        .eq("caption_id", captionId)
        .eq("profile_id", currentUserId)
        .maybeSingle<{ id: number }>();

      if (existingVoteError) {
        throw new Error(existingVoteError.message);
      }

      const votePayload: Row = {
        vote_value: numericVote,
        value: numericVote,
        profile_id: currentUserId,
        caption_id: captionId,
        user_id: currentUserId,
        modified_by_user_id: currentUserId,
      };

      const { error: voteError } = existingVote
        ? await supabase
            .from("caption_votes")
            .update(votePayload as never)
            .eq("id", existingVote.id)
        : await supabase.from("caption_votes").insert({
            ...votePayload,
            created_by_user_id: currentUserId,
          } as never);

      if (voteError) {
        throw new Error(voteError.message);
      }

      await refreshData();
      setSuccess("Rating submitted.");
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Unable to rate caption.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);

    try {
      const supabase = createPublicSupabaseClient();
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
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
        throw new Error(signInError.message);
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Unable to sign in.");
    }
  }

  async function handleSignOut() {
    setError(null);

    try {
      const supabase = createPublicSupabaseClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw new Error(signOutError.message);
      }
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Unable to sign out.");
    }
  }

  const writesDisabled = isSubmitting || isAuthLoading || !currentUserId;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Write access
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Caption creation and voting now require a signed-in Google account so audit fields
              can be written with your profile ID.
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              {isAuthLoading
                ? "Checking session..."
                : currentUserId
                  ? `Signed in as ${currentUserEmail ?? currentUserId}`
                  : "Not signed in"}
            </p>
          </div>

          {currentUserId ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
            >
              Continue with Google
            </button>
          )}
        </div>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        <form onSubmit={handleCreateCaption} className="space-y-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
          <h2 className="text-lg font-semibold text-cyan-900">Create caption</h2>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-cyan-900">Image ID</span>
            <select
              value={newCaptionImageId}
              onChange={(event) => setNewCaptionImageId(event.target.value)}
              disabled={writesDisabled}
              className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-slate-900"
            >
              <option value="">Select image</option>
              {imageOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-cyan-900">Caption</span>
            <textarea
              required
              rows={4}
              value={newCaptionText}
              onChange={(event) => setNewCaptionText(event.target.value)}
              disabled={writesDisabled}
              className="w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-slate-900"
              placeholder="Describe the image in one vivid sentence..."
            />
          </label>

          <button
            type="submit"
            disabled={writesDisabled}
            className="rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-60"
          >
            Submit caption
          </button>
        </form>

        <form onSubmit={handleRateCaption} className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-lg font-semibold text-amber-900">Rate caption</h2>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-amber-900">Caption ID</span>
            <input
              required
              value={ratingCaptionId}
              onChange={(event) => setRatingCaptionId(event.target.value)}
              disabled={writesDisabled}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-slate-900"
              placeholder="caption uuid or integer id"
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="font-medium text-amber-900">Rating (1-10)</span>
            <input
              type="number"
              min={1}
              max={10}
              required
              value={ratingValue}
              onChange={(event) => setRatingValue(event.target.value)}
              disabled={writesDisabled}
              className="w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-slate-900"
            />
          </label>

          <button
            type="submit"
            disabled={writesDisabled}
            className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-60"
          >
            Submit vote
          </button>
        </form>
      </section>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      ) : null}

      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Recent captions</h2>
        <p className="mt-1 text-sm text-slate-600">{captions.length} rows loaded.</p>

        <div className="mt-4 space-y-3">
          {captions.length ? (
            captions.map((caption) => (
              <article key={toId(caption.id) || JSON.stringify(caption)} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{captionText(caption)}</p>
                <p className="mt-1 text-xs text-slate-600">ID: {toId(caption.id) || "-"}</p>
                <p className="text-xs text-slate-600">Image ID: {toId(caption.image_id) || "-"}</p>
                <p className="text-xs text-slate-600">Created: {createdAt(caption)}</p>
              </article>
            ))
          ) : (
            <p className="text-sm text-slate-600">No captions found.</p>
          )}
        </div>
      </section>
    </div>
  );
}
