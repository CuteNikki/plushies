'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Starts every new page at the top. Next.js only scrolls when the new page's
 * top is out of view, so a short page opened from far down a long one (e.g.
 * a user from the bottom of the dashboard) opened part way down, under the
 * header. Back and forward keep the browser's own scroll position, links to
 * a #hash scroll to it, and changing just the query (filters, sorting) stays
 * put.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const backOrForward = useRef(false);

  useEffect(() => {
    const onPopState = () => (backOrForward.current = true);
    addEventListener('popstate', onPopState);
    return () => removeEventListener('popstate', onPopState);
  }, []);

  // Before paint, so the new page never shows scrolled down first.
  useLayoutEffect(() => {
    if (pathname === previous.current) return;
    previous.current = pathname;
    if (backOrForward.current) {
      backOrForward.current = false;
      return;
    }
    if (!location.hash) scrollTo(0, 0);
  }, [pathname]);

  return null;
}
