"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/captions", label: "Captions" },
  { href: "/admin/resources/caption-requests", label: "Caption Requests" },
  { href: "/admin/resources/caption-examples", label: "Caption Examples" },
  { href: "/admin/resources/humor-flavors", label: "Humor Flavors" },
  { href: "/admin/resources/humor-flavor-steps", label: "Humor Flavor Steps" },
  { href: "/admin/resources/humor-mix", label: "Humor Mix" },
  { href: "/admin/resources/terms", label: "Terms" },
  { href: "/admin/resources/llm-models", label: "LLM Models" },
  { href: "/admin/resources/llm-providers", label: "LLM Providers" },
  { href: "/admin/resources/llm-prompt-chains", label: "LLM Prompt Chains" },
  { href: "/admin/resources/llm-responses", label: "LLM Responses" },
  { href: "/admin/resources/signup-domains", label: "Signup Domains" },
  { href: "/admin/resources/whitelist-emails", label: "Whitelist Emails" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/admin" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "border-amber-500 bg-amber-100 text-amber-900"
                : "border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-700"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
