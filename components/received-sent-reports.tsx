'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ChevronRightIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

type Tab = {
  /** How many reports, for the switch. */
  count: number;
  /** The cards, or why there are none. */
  list: React.ReactNode;
  /** Where all of them are, when this shows only the latest. */
  more: string | null;
};

/**
 * Reports on someone's page, one list at a time: the ones about them, or the
 * ones they sent. Both come rendered; switching just shows the other.
 */
export function ReceivedSentReports({
  received,
  sent,
}: {
  received: Tab;
  sent: Tab;
}) {
  const [showSent, setShowSent] = useState(false);
  const tab = showSent ? sent : received;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div
          role='group'
          aria-label='Reports'
          className='flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1'
        >
          {(
            [
              [false, 'Received', received.count],
              [true, 'Sent', sent.count],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={label}
              type='button'
              aria-pressed={showSent === value}
              onClick={() => setShowSent(value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                showSent === value
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {label}
              <span className='text-xs text-muted-foreground'>{count}</span>
            </button>
          ))}
        </div>
        {tab.more && (
          <Button variant='ghost' size='sm' className='shrink-0' asChild>
            <Link href={tab.more}>
              Show all
              <ChevronRightIcon />
            </Link>
          </Button>
        )}
      </div>
      {tab.list}
    </div>
  );
}
