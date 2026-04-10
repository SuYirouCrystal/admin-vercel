import Link from "next/link";
import type { ReactNode } from "react";

import {
  buildPageHref,
  paginationWindow,
  type SearchParamRecord,
} from "@/lib/pagination";

type Props = {
  basePath: string;
  searchParams: SearchParamRecord;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
};

export default function PaginationControls({
  basePath,
  searchParams,
  currentPage,
  pageSize,
  totalItems,
  itemLabel,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);
  const visiblePages = paginationWindow(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <p className="text-sm text-slate-600">
        Showing {startItem} to {endItem} of {totalItems} {itemLabel}
      </p>

      {totalItems > 0 ? (
        <nav className="flex flex-wrap items-center gap-2" aria-label={`${itemLabel} pagination`}>
          <PaginationLink
            href={buildPageHref(basePath, searchParams, 1)}
            disabled={currentPage === 1}
          >
            First
          </PaginationLink>
          <PaginationLink
            href={buildPageHref(basePath, searchParams, Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </PaginationLink>

          {visiblePages.map((page) => (
            <PaginationLink
              key={page}
              href={buildPageHref(basePath, searchParams, page)}
              isActive={page === currentPage}
            >
              {page}
            </PaginationLink>
          ))}

          <PaginationLink
            href={buildPageHref(basePath, searchParams, Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </PaginationLink>
          <PaginationLink
            href={buildPageHref(basePath, searchParams, totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
          </PaginationLink>
        </nav>
      ) : null}
    </div>
  );
}

function PaginationLink({
  href,
  disabled = false,
  isActive = false,
  children,
}: {
  href: string;
  disabled?: boolean;
  isActive?: boolean;
  children: ReactNode;
}) {
  if (disabled) {
    return (
      <span className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-400">
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
        isActive
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-700"
      }`}
    >
      {children}
    </Link>
  );
}
