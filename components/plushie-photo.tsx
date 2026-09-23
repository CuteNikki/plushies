import { Heart } from 'lucide-react';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import type { Plushie } from '@/lib/plushies';

export function PlushiePhoto({
  plushie,
  sizes,
  priority,
  className,
}: {
  plushie: Plushie;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative aspect-square overflow-hidden bg-linear-to-br from-accent via-muted to-secondary',
        className
      )}
    >
      {plushie.image ? (
        <Image
          src={plushie.image}
          alt={`Photo of ${plushie.name}`}
          fill
          sizes={sizes}
          priority={priority}
          className='object-cover'
        />
      ) : (
        <div className='flex size-full flex-col items-center justify-center gap-2 text-primary/60'>
          <Heart className='size-1/4 fill-current' />
          <span className='font-heading text-sm'>Photo coming soon</span>
        </div>
      )}
    </div>
  );
}
