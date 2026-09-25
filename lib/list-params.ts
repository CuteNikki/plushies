// How lists read their search, sort and filter from the URL. Used on the
// server and in the browser.

/** The search typed into a list, trimmed and kept short, or null. */
export function searchQuery(value: unknown) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, 100) || null;
}

/**
 * Whether any of `texts` has `q` in it, ignoring case, for lists searched
 * after loading. Everything matches no search.
 */
export function matchesSearch(
  q: string | null,
  texts: (string | null | undefined)[]
) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return texts.some((text) => text?.toLowerCase().includes(needle));
}

/** One of `options` from the URL, or the first one, the default. */
export function oneOf<const T extends string>(
  value: unknown,
  options: readonly T[]
): T {
  return typeof value === 'string' && options.includes(value as T)
    ? (value as T)
    : options[0];
}

/**
 * The page's query as plain strings, so a control can change one value and
 * keep the rest.
 */
export function plainQuery(
  searchParams: Record<string, string | string[] | undefined>
) {
  return Object.fromEntries(
    Object.entries(searchParams).flatMap(([key, value]) =>
      typeof value === 'string' ? [[key, value]] : []
    )
  );
}

/** A link to `path` with `query`, leaving out empty values. */
export function withQuery(path: string, query: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  return params.size ? `${path}?${params}` : path;
}

/** ?page=, counted from 1; anything else is the first page. */
export function pageNumber(value: string | string[] | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

/** How many a list can show a page at a time, and how many it does unasked. */
export type PageSizes = { options: readonly number[]; default: number };

/** The usual choice for lists of rows and cards. */
export const PAGE_SIZES: PageSizes = {
  options: [10, 25, 50, 100],
  default: 25,
};

/** For lists of big cards, like reports. */
export const CARD_PAGE_SIZES: PageSizes = {
  options: [10, 25, 50],
  default: 10,
};

/** ?per=, if it's one of `sizes`; otherwise the default. */
export function pageSize(
  value: string | string[] | undefined,
  sizes: PageSizes = PAGE_SIZES
) {
  const size = Number(value);
  return sizes.options.includes(size) ? size : sizes.default;
}

/**
 * The page numbers a pager shows: always the first and last, and a few
 * around `page`, with null where some are left out. Near either end the few
 * shift inwards, so the pager stays about as wide. A gap of one shows that
 * page instead, since "…" would take as much room.
 */
export function pageItems(page: number, pages: number, around = 1) {
  const shown = new Set([1, pages]);
  const start = Math.max(2, Math.min(page - around, pages - 1 - 2 * around));
  for (let n = start; n <= start + 2 * around && n < pages; n++) {
    shown.add(n);
  }
  const sorted = [...shown].sort((a, b) => a - b);
  const items: (number | null)[] = [];
  for (const n of sorted) {
    const last = items.at(-1);
    if (typeof last === 'number' && n - last === 2) items.push(last + 1);
    else if (typeof last === 'number' && n - last > 2) items.push(null);
    items.push(n);
  }
  return items;
}
