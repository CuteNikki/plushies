'use client';

import Image from 'next/image';
import { useState } from 'react';

import type { Plushie } from '@/data/plushies';
import { cn } from '@/lib/utils';

import { Reveal, RevealGroup, RevealItem } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';

/**
 * The thumbnail and gallery, with a strip of small photos to switch between.
 * The big photo slides in first, then the small ones one after another.
 */
export function PlushiePhotos({
  plushie,
}: {
  plushie: Pick<Plushie, 'name' | 'thumbnail' | 'gallery'>;
}) {
  const photos = [plushie.thumbnail, ...plushie.gallery].filter((p) => !!p);
  const [selected, setSelected] = useState(0);
  const current = photos[selected];

  if (!current) {
    return (
      <Reveal direction='right'>
        <PlushiePhoto
          plushie={plushie}
          sizes='(min-width: 768px) 50vw, 100vw'
          className='rounded-2xl ring-1 ring-foreground/10'
        />
      </Reveal>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <Reveal
        direction='right'
        className='relative aspect-square overflow-hidden rounded-2xl bg-muted ring-1 ring-foreground/10'
      >
        <Image
          key={current.key}
          src={current.url}
          alt={`Photo ${selected + 1} of ${plushie.name}`}
          fill
          sizes='(min-width: 768px) 50vw, 100vw'
          preload={selected === 0}
          className='object-cover'
        />
      </Reveal>

      {photos.length > 1 && (
        <RevealGroup as='ul' interval={0.08} className='grid grid-cols-5 gap-2'>
          {photos.map((photo, index) => (
            <RevealItem as='li' key={photo.key} direction='right'>
              <button
                type='button'
                onClick={() => setSelected(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === selected}
                className={cn(
                  'relative block aspect-square w-full overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 transition focus-visible:ring-2 focus-visible:ring-ring',
                  index === selected
                    ? 'ring-2 ring-primary'
                    : 'opacity-70 hover:opacity-100'
                )}
              >
                <Image
                  src={photo.url}
                  alt=''
                  fill
                  sizes='(min-width: 768px) 10vw, 20vw'
                  className='object-cover'
                />
              </button>
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}
