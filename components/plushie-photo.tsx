import Image from 'next/image';

import { HeartCrackIcon } from 'lucide-react';

import type { Plushie } from '@/data/plushies';
import { cn } from '@/lib/utils';

export function PlushiePhoto({
  plushie,
  sizes,
  preload,
  compact,
  className,
}: {
  plushie: Pick<Plushie, 'name' | 'thumbnail'>;
  sizes: string;
  preload?: boolean;
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
          preload={preload}
          className='object-cover'
        />
      ) : (
        <div className='flex size-full flex-col items-center justify-center gap-2 text-primary/60'>
          <HeartCrackIcon className='size-1/2 fill-current' />
          {!compact && (
            <span className='font-heading text-sm'>Missing Photo</span>
          )}
        </div>
      )}
    </div>
  );
}
