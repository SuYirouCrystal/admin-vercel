import Link from "next/link";

import CaptionWorkbench from "@/components/caption-workbench";
import PipelineWorkbench from "@/components/pipeline-workbench";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
          Assignment: Caption Generation + Ranking
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
          Caption Generation Workbench
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
          Feedback from user testing pointed to three recurring problems: people were not sure
          what to do first, the token requirement felt too technical, and ranking captions by
          manually copying IDs was slow. This page now keeps those flows in one place and makes
          the next action visible at each step.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Improvement 1
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Added a clearer first-step walkthrough so new users know the order: token, image,
              then run.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Improvement 2
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Strengthened status and response handling so the pipeline explains what it is doing
              and recovers better from messy API JSON.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
              Improvement 3
            </p>
            <p className="mt-2 text-sm text-slate-700">
              Moved caption creation and rating onto the home page so testers can select captions
              directly instead of typing IDs by hand.
            </p>
          </article>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/list"
            className="inline-flex rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            View Supabase list page
          </Link>
        </div>
      </section>

      <PipelineWorkbench />
      <CaptionWorkbench />
    </main>
  );
}
