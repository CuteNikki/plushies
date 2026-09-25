import Link from 'next/link';

import { cn } from '@/lib/utils';

import { PlushieContextMenu } from '@/components/plushie-menu';
import { PlushiePhoto } from '@/components/plushie-photo';

/**
 * A plushie's photo in a row about something else, e.g. a comment: it opens
 * the plushie's page, and their actions on right-click, while the rest of
 * the row goes where the row does. Above a RowLink, which it would be under.
 */
export function PlushieThumb({
  plushie,
  sizes,
  className,
}: {
  plushie: {
    id: string;
    slug: string;
    name: string;
    thumbnail: { key: string; url: string } | null;
  };
  sizes: string;
  /** The photo's size and shape, e.g. 'size-10 rounded-lg'. */
  className: string;
}) {
  return (
    <PlushieContextMenu plushie={plushie} className='relative shrink-0'>
      {/* The row's own link is the one to tab to. */}
      <Link
        href={`/plushies/${plushie.slug}`}
        tabIndex={-1}
        aria-hidden
        className='relative block shrink-0'
      >
        <PlushiePhoto
          plushie={plushie}
          sizes={sizes}
          compact
          className={cn('transition hover:brightness-110', className)}
        />
      </Link>
    </PlushieContextMenu>
  );
}
