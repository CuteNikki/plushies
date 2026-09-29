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
 * opened by a link, unknown after going back or forward. For browsers
 * without the Navigation API, which can't list the history.
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

/** The parts of the Navigation API used here, not in TypeScript's types yet. */
type HistoryEntry = {
  key: string;
  index: number;
  url: string | null;
  /** False for entries from before the last full page load. */
  sameDocument: boolean;
};

type HistoryEntries = {
  currentEntry: HistoryEntry | null;
  entries(): HistoryEntry[];
};

function historyEntries() {
  return (globalThis as { navigation?: HistoryEntries }).navigation;
}

/**
 * Identifies the history entry being shown, to remember its scroll position.
 * Null in browsers without the Navigation API.
 */
export function currentEntryKey() {
  return historyEntries()?.currentEntry?.key ?? null;
}

/**
 * How many steps back in the history the last visit to `pathname` is, or
 * the page before this one without one; null when it isn't there, e.g. for
 * a page opened from elsewhere. Going back keeps that page's scroll position
 * and filters, where a link would start it over. Browsers without the
 * Navigation API only know the page right behind this one.
 */
export function stepsBackTo(pathname?: string) {
  const navigation = historyEntries();
  const current = navigation?.currentEntry;
  if (!navigation || !current) {
    const found = openedFrom !== null && (!pathname || openedFrom === pathname);
    return found ? 1 : null;
  }
  // Only this site's pages are listed, the latest first when going back.
  // Not past the last full page load, e.g. an address typed in: going back
  // there loads the page afresh.
  const entries = navigation.entries();
  for (let index = current.index - 1; index >= 0; index--) {
    const { url, sameDocument } = entries[index];
    if (!url || !sameDocument) return null;
    if (!pathname || new URL(url).pathname === pathname) {
      return current.index - index;
    }
  }
  return null;
}
