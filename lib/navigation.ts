/**
 * How people got to the page they're on, tracked by ScrollToTop. Kept in
 * memory, so a reload starts fresh.
 */

/**
 * The page reached with back or forward, which appears as it was left
 * instead of animating again. Cleared by the next link.
 */
let returnedTo: string | null = null;

/**
 * The page right behind this one in the history: set when this page was
 * opened by a link, unknown after going back or forward.
 */
let openedFrom: string | null = null;

/**
 * Called on back and forward, before the page they return to renders. The
 * address has changed by then, so it names that page.
 */
export function returnToPage(pathname: string) {
  returnedTo = pathname;
}

/** Whether this page was reached with back or forward. */
export function isReturningTo(pathname: string) {
  return returnedTo === pathname;
}

/** Called once a new page shows, with the one before it. */
export function leavePage(pathname: string, next: { byLink: boolean }) {
  openedFrom = next.byLink ? pathname : null;
  if (next.byLink) returnedTo = null;
}

/**
 * Whether going back in the history returns to `pathname`, or to any page
 * of this site without one. Going back keeps that page's scroll position and
 * filters, where a link would start it over.
 */
export function canGoBackTo(pathname?: string) {
  return openedFrom !== null && (!pathname || openedFrom === pathname);
}
