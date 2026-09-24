import Link from 'next/link';

import type { Plushie } from '@/data/plushies';

import { PlushiePhoto } from '@/components/plushie-photo';
import { Badge } from '@/components/ui/badge';

/** A plushie's photo and name, linking to their page. */
export function PlushieCard({
  plushie,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
  preload,
}: {
  plushie: Pick<Plushie, 'slug' | 'name' | 'pronouns' | 'thumbnail'>;
  sizes?: string;
  /** Load the photo right away, for cards visible when the page opens. */
  preload?: boolean;
}) {
  return (
    <Link
      href={`/plushies/${plushie.slug}`}
      className='group block overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring'
    >
      <PlushiePhoto
        plushie={plushie}
        sizes={sizes}
        preload={preload}
        className='transition group-hover:brightness-105'
      />
      <div className='flex items-center justify-between gap-2 p-3 px-4'>
        <h2 className='truncate font-heading text-base font-semibold'>
          {plushie.name}
        </h2>
        {plushie.pronouns && (
          <Badge variant='secondary'>{plushie.pronouns}</Badge>
        )}
      </div>
    </Link>
  );
}
