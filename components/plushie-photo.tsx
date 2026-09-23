import { Heart } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import type { Plushie } from '@/lib/plushies';

export function PlushiePhoto({
  plushie,
  sizes,
  priority,
  compact,
  className,
}: {
  plushie: Pick<Plushie, 'name' | 'thumbnail'>;
  sizes: string;
  priority?: boolean;
  /** Hides the "Photo coming soon" text, for small thumbnails. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-square overflow-hidden bg-linear-to-br from-accent via-muted to-secondary',
        className
      )}
    >
      {plushie.thumbnail ? (
        <Image
          src={plushie.thumbnail.url}
          alt={`Photo of ${plushie.name}`}
          fill
          sizes={sizes}
          priority={priority}
          className='object-cover'
        />
      ) : (
        <div className='flex size-full flex-col items-center justify-center gap-2 text-primary/60'>
          <Heart className='size-1/4 fill-current' />
          {!compact && (
            <span className='font-heading text-sm'>Photo coming soon</span>
          )}
        </div>
      )}
    </div>
  );
}
