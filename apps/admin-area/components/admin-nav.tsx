"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/profiles", label: "Profiles" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/captions", label: "Captions" },
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
