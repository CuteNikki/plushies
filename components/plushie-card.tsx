import Link from 'next/link';

import type { Plushie } from '@/data/plushies';

import { ItemMenuButton } from '@/components/item-menu';
import { PlushieContextMenu } from '@/components/plushie-menu';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Badge } from '@/components/ui/badge';

/**
 * A plushie's photo and name, linking to their page, with their actions on
 * right-click and a button in the corner for editors and admins.
 */
export function PlushieCard({
  plushie,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
  preload,
}: {
  plushie: Pick<Plushie, 'id' | 'slug' | 'name' | 'pronouns' | 'thumbnail'>;
  sizes?: string;
  /** Load the photo right away, for cards visible when the page opens. */
  preload?: boolean;
}) {
  return (
    <PlushieContextMenu
      plushie={plushie}
      as='div'
      className='group/card relative h-full'
    >
      <Link
        href={`/plushies/${plushie.slug}`}
        // As tall as the others in its row, whose pronouns might wrap.
        className='group flex h-full flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring'
      >
        <PlushiePhoto
          plushie={plushie}
          sizes={sizes}
          preload={preload}
          className='transition group-hover:brightness-105'
        />
        {/* The pronouns go below names too long to fit beside them. Only
            names too long for the whole card end in "…", shown whole on
            hover. */}
        <div className='flex flex-wrap items-center justify-between gap-x-1.5 gap-y-1 p-3'>
          <h2
            title={plushie.name}
            className='max-w-full truncate font-heading text-sm font-semibold sm:text-base'
          >
            {plushie.name}
          </h2>
          {plushie.pronouns && (
            <Badge variant='secondary' size='sm'>
              {plushie.pronouns}
            </Badge>
          )}
        </div>
      </Link>
      {/* Beside the link rather than in it, where a button can't go. Shows on
          hover and focus, and always on touch screens, which can't hover. */}
      <ItemMenuButton
        size='icon-sm'
        className='absolute top-2 right-2 rounded-full bg-background/80 shadow-sm backdrop-blur transition-opacity hover:bg-background pointer-fine:opacity-0 pointer-fine:group-hover/card:opacity-100 pointer-fine:focus-visible:opacity-100 pointer-fine:aria-expanded:opacity-100'
      />
    </PlushieContextMenu>
  );
}
