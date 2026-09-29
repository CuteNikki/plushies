'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';

import { currentEntryKey, leavePage, returnToPage } from '@/lib/navigation';

/**
 * Starts every new page at the top. Next.js only scrolls when the new page's
 * top is out of view, so a short page opened from far down a long one (e.g.
 * a user from the bottom of the dashboard) opened part way down, under the
 * header. Back and forward return to where the page was left, links to a
 * #hash scroll to it, and changing just the query (filters, sorting) stays
 * put. Also notes where people have been, for lib/navigation.ts.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  /** The history entry gone back or forward to, until its page shows. */
  const returning = useRef<{ key: string | null } | null>(null);
  /** Where each history entry was left, by its key. */
  const positions = useRef(new Map<string, number>());

  useEffect(() => {
    const onPopState = () => {
      // Just the query changing keeps the page, and the browser's scroll.
      if (location.pathname === previous.current) return;
      returning.current = { key: currentEntryKey() };
      returnToPage(location.pathname);
    };
    // Not while going back or forward: the browser moves the scroll while
    // the page before is still shown.
    const onScroll = () => {
      const key = currentEntryKey();
      if (key && !returning.current) positions.current.set(key, scrollY);
    };
    addEventListener('popstate', onPopState);
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('popstate', onPopState);
      removeEventListener('scroll', onScroll);
    };
  }, []);

  // Before paint, so the new page never shows scrolled down first.
  useLayoutEffect(() => {
    if (pathname === previous.current) return;
    const back = returning.current;
    returning.current = null;
    leavePage(previous.current, { byLink: !back });
    previous.current = pathname;
    if (back) {
      // The browser restores it too, but only right away: a page that had
      // to load first, e.g. after a change, came back cut short by the
      // shorter page before it.
      const saved = back.key ? positions.current.get(back.key) : undefined;
      if (saved !== undefined) scrollTo(0, saved);
      return;
    }
    if (!location.hash) scrollTo(0, 0);
  }, [pathname]);

  return null;
}
