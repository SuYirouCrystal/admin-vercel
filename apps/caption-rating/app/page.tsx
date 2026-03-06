import Link from "next/link";

import PipelineWorkbench from "@/components/pipeline-workbench";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-10">
      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-wide text-indigo-700 uppercase">
          Assignment: Image Upload + Caption Pipeline
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">
          Caption Generation Workbench
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600 md:text-base">
          Upload an image, register it through the staging pipeline API, and view generated
          caption records in one flow.
        </p>

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
    </main>
  );
}
