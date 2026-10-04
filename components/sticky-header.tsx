'use client';

import { useEffect, useRef } from 'react';

/**
 * A header that keeps --header-height up to date as it grows or shrinks,
 * e.g. when the viewing-as banner shows or wraps.
 */
export function StickyHeader(props: React.ComponentProps<'header'>) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty('--header-height', `${header.offsetHeight}px`);
    });
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.removeProperty('--header-height');
    };
  }, []);

  return <header ref={ref} {...props} />;
}
