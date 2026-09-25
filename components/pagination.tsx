import Link from 'next/link';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

/**
 * Buttons under a list that's shown a page at a time, newest first: back to
 * the newest page, and on to older ones. Nothing when there's one page.
 */
export function Pagination({
  newest,
  older,
  newestLabel = 'Newest',
  olderLabel = 'Older',
}: {
  /** Where the first page is, when this isn't it. */
  newest: string | null;
  /** Where the next page is, if there is one. */
  older: string | null;
  newestLabel?: string;
  olderLabel?: string;
}) {
  if (!newest && !older) return null;
  return (
    <Reveal as='nav' aria-label='Pages' className='flex justify-between gap-2'>
      {newest ? (
        <Button variant='outline' size='sm' asChild>
          <Link href={newest}>
            <ChevronLeftIcon />
            {newestLabel}
          </Link>
        </Button>
      ) : (
        <span />
      )}
      {older && (
        <Button variant='outline' size='sm' asChild>
          <Link href={older}>
            {olderLabel}
            <ChevronRightIcon />
          </Link>
        </Button>
      )}
    </Reveal>
  );
}
