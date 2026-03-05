import CaptionWorkbench from "@/components/caption-workbench";
import { createPublicSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

export default async function HomePage() {
  let images: Row[] = [];
  let captions: Row[] = [];
  let error: string | null = null;

  try {
    const supabase = createPublicSupabaseClient();

    const [imagesResult, captionsResult] = await Promise.all([
      supabase.from("images").select("*").limit(80).order("created_at", { ascending: false }),
      supabase
        .from("captions")
        .select("*")
        .limit(120)
        .order("created_at", { ascending: false }),
    ]);

    if (imagesResult.error) {
      throw new Error(imagesResult.error.message);
    }
    if (captionsResult.error) {
      throw new Error(captionsResult.error.message);
    }

    images = (imagesResult.data ?? []) as Row[];
    captions = (captionsResult.data ?? []) as Row[];
  } catch (unknownError) {
    error = unknownError instanceof Error ? unknownError.message : "Unable to load data.";
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">App one</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Caption Creation and Rating</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Create caption entries and score existing captions from a single workspace.
        </p>
      </section>

      <CaptionWorkbench initialImages={images} initialCaptions={captions} initialError={error} />
    </main>
  );
}
