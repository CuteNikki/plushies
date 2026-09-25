'use client';

import { useState } from 'react';

import { SearchIcon } from 'lucide-react';

import type { Plushie } from '@/data/plushies';

import { EmptyState } from '@/components/empty-state';
import { Reveal } from '@/components/motion';
import { PlushieCard } from '@/components/plushie-card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** They come oldest first, in the order they were added. */
const orders = {
  oldest: 'Oldest first',
  newest: 'Newest first',
  name: 'Name A–Z',
  likes: 'Most liked',
} as const;

type Order = keyof typeof orders;

export function PlushieGallery({ plushies }: { plushies: Plushie[] }) {
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order>('oldest');

  const q = query.trim().toLowerCase();
  const filtered = plushies.filter((plushie) =>
    [plushie.name, plushie.species, plushie.pronouns, ...(plushie.traits ?? [])]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(q))
  );
  const shown =
    order === 'newest'
      ? filtered.toReversed()
      : order === 'name'
        ? filtered.toSorted((a, b) => a.name.localeCompare(b.name))
        : order === 'likes'
          ? filtered.toSorted((a, b) => b.likes - a.likes)
          : filtered;

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex flex-wrap gap-2'>
        <div className='relative w-full max-w-sm'>
          <SearchIcon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            type='search'
            placeholder='Search by name, species, trait…'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className='h-10 rounded-full pl-9 text-sm'
            aria-label='Search plushies'
          />
        </div>
        <Select value={order} onValueChange={(v) => setOrder(v as Order)}>
          <SelectTrigger
            className='h-10! w-auto min-w-36 rounded-full'
            aria-label='Order'
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(orders) as Order[]).map((key) => (
              <SelectItem key={key} value={key}>
                {orders[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Reveal>

      {shown.length === 0 ? (
        <EmptyState icon={SearchIcon} className='py-12'>
          No plushies match &ldquo;{query}&rdquo;.
        </EmptyState>
      ) : (
        <ul className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
          {shown.map((plushie, index) => (
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
