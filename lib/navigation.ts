/**
 * Where people have been during this visit, tracked by ScrollToTop. Kept in
 * memory, so a reload starts fresh.
 */

/** Pages shown before, which appear right away instead of animating again. */
const seenPages = new Set<string>();

/**
 * The page right behind this one in the history: set when this page was
 * opened by a link, unknown after going back or forward.
 */
let openedFrom: string | null = null;

export function hasSeenPage(pathname: string) {
  return seenPages.has(pathname);
}

/** Called when a page is left, and with the next page's opener. */
export function leavePage(pathname: string, next: { byLink: boolean }) {
  seenPages.add(pathname);
  openedFrom = next.byLink ? pathname : null;
}

/**
 * Whether going back in the history returns to `pathname`, or to any page
 * of this site without one. Going back keeps that page's scroll position and
 * filters, where a link would start it over.
 */
export function canGoBackTo(pathname?: string) {
  return openedFrom !== null && (!pathname || openedFrom === pathname);
}
