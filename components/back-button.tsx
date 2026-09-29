'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ArrowLeftIcon } from 'lucide-react';

import { canGoBackTo } from '@/lib/navigation';

import { Button } from '@/components/ui/button';

/**
 * Goes back in the history when that's where `href` points, so the page
 * returns as it was left: scrolled down, filtered and sorted. A plain link
 * otherwise, e.g. when the page was opened from elsewhere, and always when
 * opened in a new tab.
 */
export function useBackLink(href: string, { anyPage = false } = {}) {
  const router = useRouter();
  return (event: React.MouseEvent) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey)
      return false;
    if (!canGoBackTo(anyPage ? undefined : href.split('?')[0])) return false;
    event.preventDefault();
    router.back();
    return true;
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
  const goBack = useBackLink(href);
  return (
    <Button variant='ghost' size='sm' className='w-fit' asChild>
      <Link href={href} onClick={goBack}>
        <ArrowLeftIcon />
        {children}
      </Link>
    </Button>
  );
}
