// How lists read their search, sort and filter from the URL. Used on the
// server and in the browser.

/** The search typed into a list, trimmed and kept short, or null. */
export function searchQuery(value: unknown) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, 100) || null;
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
