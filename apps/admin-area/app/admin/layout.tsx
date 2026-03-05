import type { ReactNode } from "react";

import AdminNav from "@/components/admin-nav";
import { pickFirstField, valueAsString } from "@/lib/data-helpers";
import { requireSuperadmin } from "@/lib/auth";

function resolveDisplayName(profile: Record<string, unknown>, fallbackEmail: string) {
  const name = valueAsString(
    pickFirstField(profile, ["full_name", "display_name", "username", "email"])
  );

  return name || fallbackEmail;
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await requireSuperadmin();

  return (
    <div className="mx-auto w-full max-w-7xl px-5 py-5 md:px-8 md:py-7">
      <header className="mb-6 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_rgba(16,35,50,0.1)] backdrop-blur md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
              Superadmin Console
            </p>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Control Center
            </h1>
            <p className="text-sm text-slate-600">
              Signed in as <strong>{resolveDisplayName(profile, user.email ?? "superadmin")}</strong>
            </p>
          </div>

          <form action="/logout" method="post">
            <button
              type="submit"
              className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            >
              Sign out
            </button>
          </form>
        </div>

        <div className="mt-5">
          <AdminNav />
        </div>
      </header>

      {children}
    </div>
  );
}
