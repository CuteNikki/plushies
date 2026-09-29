'use client';

import Link from 'next/link';

import { ArrowLeftIcon } from 'lucide-react';

import { stepsBackTo } from '@/lib/navigation';

import { Button } from '@/components/ui/button';

/**
 * Goes back in the history to the last visit to where `href` points, or to
 * the page before with `anyPage`, however many steps back, so the page
 * returns as it was left: scrolled down, filtered and sorted. A plain link
 * otherwise, e.g. when the page was opened from elsewhere, and always when
 * opened in a new tab.
 */
export function onBackLinkClick(href: string, { anyPage = false } = {}) {
  return (event: React.MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
      return;
    const steps = stepsBackTo(anyPage ? undefined : href.split('?')[0]);
    if (!steps) return;
    event.preventDefault();
    history.go(-steps);
  };
}

/** A small link back to the page above, shown at the top of a page. */
export function BackButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button variant='ghost' size='sm' className='w-fit' asChild>
      <Link href={href} onClick={onBackLinkClick(href)}>
        <ArrowLeftIcon />
        {children}
      </Link>
    </Button>
  );
}
