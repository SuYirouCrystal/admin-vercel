export type SearchParamRecord = Record<string, string | string[] | undefined>;

const TRANSIENT_QUERY_KEYS = new Set(["page", "success", "error"]);

export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function getRangeForPage(page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  return { from, to };
}

export function buildPageHref(
  basePath: string,
  searchParams: SearchParamRecord,
  page: number
) {
  const params = new URLSearchParams();

  for (const [key, rawValue] of Object.entries(searchParams)) {
    if (TRANSIENT_QUERY_KEYS.has(key)) {
      continue;
    }

    if (typeof rawValue === "string") {
      params.set(key, rawValue);
      continue;
    }

    if (Array.isArray(rawValue)) {
      for (const value of rawValue) {
        params.append(key, value);
      }
    }
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function mergeMessageIntoPath(
  path: string,
  type: "success" | "error",
  message: string
) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);

  params.delete("success");
  params.delete("error");
  params.set(type, message.slice(0, 220));

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}

export function stripQuery(path: string) {
  return path.split("?")[0] || path;
}

export function paginationWindow(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5];
  }

  if (currentPage >= totalPages - 2) {
    return [
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
  ];
}
