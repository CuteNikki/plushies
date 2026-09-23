'use client';

import { Search } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { Plushie } from '@/lib/plushies';

import { Reveal } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export function PlushieGallery({ plushies }: { plushies: Plushie[] }) {
  const [query, setQuery] = useState('');
  // Once someone searches, cards that reappear skip the page intro timing.
  const [searched, setSearched] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = plushies.filter((plushie) =>
    [plushie.name, plushie.species, plushie.pronouns, ...(plushie.traits ?? [])]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q))
  );

  return (
    <div className='flex flex-col gap-6'>
      <Reveal delay={0.35} className='relative max-w-sm'>
        <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          type='search'
          placeholder='Search by name, species, trait…'
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSearched(true);
          }}
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
            <Reveal
              as='li'
              key={plushie.slug}
              // After the title and search bar, one card at a time. Cards
              // scrolled to later only cascade across their row.
              delay={searched ? (index % 4) * 0.06 : 0.55 + index * 0.1}
              scrollDelay={(index % 4) * 0.1}
            >
              <Link
                href={`/plushies/${plushie.slug}`}
                className='group block overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/10 hover:ring-primary/40 focus-visible:ring-2 focus-visible:ring-ring'
              >
                <PlushiePhoto
                  plushie={plushie}
                  sizes='(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw'
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
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
