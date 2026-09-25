import Link from 'next/link';

import { cn } from '@/lib/utils';

import { PlushieContextMenu } from '@/components/plushie-menu';
import { PlushiePhoto } from '@/components/plushie-photo';

/**
 * Plushies someone likes, as a grid of photos and names that open their
 * pages, with their actions on right-click.
 */
export function LikedPlushies({
  plushies,
  preview,
}: {
  /** The few on their page: one row of six, so none is left over. */
  preview?: boolean;
  plushies: {
    id: string;
    slug: string;
    name: string;
    thumbnailKey: string | null;
    thumbnailUrl: string | null;
  }[];
}) {
  return (
    <ul
      className={cn(
        'grid grid-cols-3 gap-3',
        preview ? 'sm:grid-cols-6' : 'sm:grid-cols-5 lg:grid-cols-8'
      )}
    >
      {plushies.map((plushie) => (
        <li key={plushie.id}>
          <PlushieContextMenu plushie={plushie} as='div'>
            <Link
              href={`/plushies/${plushie.slug}`}
              className='group flex flex-col gap-1.5'
            >
              <PlushiePhoto
                plushie={{
                  name: plushie.name,
                  thumbnail:
                    plushie.thumbnailKey && plushie.thumbnailUrl
                      ? { key: plushie.thumbnailKey, url: plushie.thumbnailUrl }
                      : null,
                }}
                sizes='128px'
                compact
                className='w-full rounded-xl'
              />
              <span className='truncate text-sm font-medium group-hover:underline'>
                {plushie.name}
              </span>
            </Link>
          </PlushieContextMenu>
        </li>
      ))}
    </ul>
  );
}
