'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

import type { Plushie } from '@/lib/plushies';

import { Reveal } from '@/components/motion';
import { PlushieCard } from '@/components/plushie-card';
import { Input } from '@/components/ui/input';

export function PlushieGallery({ plushies }: { plushies: Plushie[] }) {
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = plushies.filter((plushie) =>
    [plushie.name, plushie.species, plushie.pronouns, ...(plushie.traits ?? [])]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q))
  );

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='relative max-w-sm'>
        <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='search'
          placeholder='Search by name, species, trait…'
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className='h-10 rounded-full pl-9 text-sm'
          aria-label='Search plushies'
        />
      </Reveal>

      {filtered.length === 0 ? (
        <p className='py-12 text-center text-muted-foreground'>
          No plushies match &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <ul className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
          {filtered.map((plushie, index) => (
            <Reveal as='li' key={plushie.slug}>
              <PlushieCard
                plushie={plushie}
                // The first row is on screen right away.
                preload={index < 4}
              />
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
