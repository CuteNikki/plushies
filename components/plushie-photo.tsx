import type { Plushie } from '@/data/plushies';
import { cn } from '@/lib/utils';

import { MissingPhoto, PhotoImage } from '@/components/photo-image';

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
        <PhotoImage
          src={plushie.thumbnail.url}
          alt={`Photo of ${plushie.name}`}
          fill
          sizes={sizes}
          preload={preload}
          compact={compact}
          className='object-cover'
        />
      ) : (
        <MissingPhoto compact={compact} />
      )}
    </div>
  );
}
