import type { Context } from "hono";

/**
 * Temporarily 500 to match the previous hard-coded cap, so existing screens
 * render exactly what they did before pagination landed. Drop this to ~50 once
 * the client uses `hasMore` for infinite scroll.
 */
export const DEFAULT_PAGE_SIZE = 500;
export const MAX_PAGE_SIZE = 500;

export interface PageParams {
  limit: number;
  offset: number;
  page: number;
}

/**
 * Parse `?page=` / `?pageSize=` into a bounded LIMIT/OFFSET.
 *
 * Bounded on purpose: an unbounded pageSize lets one request pull the whole
 * table, and a negative offset is a SQL error. Junk input falls back to the
 * defaults rather than erroring — a bad query string shouldn't break a list.
 */
export function pageParams(c: Context): PageParams {
  const rawPage = Number(c.req.query("page"));
  const rawSize = Number(c.req.query("pageSize"));

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawSize) && rawSize >= 1
      ? Math.min(Math.floor(rawSize), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return { limit, offset: (page - 1) * limit, page };
}

/** Envelope describing whether more rows exist, without a second COUNT query. */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Build a page from rows fetched with `limit + 1`. Fetching one extra row tells
 * us whether a next page exists without paying for a COUNT(*) over the table.
 */
export function toPage<T>(rows: T[], { limit, page }: PageParams): Paged<T> {
  const hasMore = rows.length > limit;
  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    page,
    pageSize: limit,
    hasMore,
  };
}
