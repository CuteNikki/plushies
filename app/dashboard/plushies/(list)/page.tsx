import type { Metadata } from 'next';
import Link from 'next/link';

import { PencilIcon, PlusIcon } from 'lucide-react';

import { getPlushies } from '@/data/plushies';
import { requireEditor } from '@/lib/session';
import { count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { Reveal } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Edit Plushies' };

export default async function PlushiesPage() {
  await requireEditor();
  const plushies = await getPlushies();

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex'>
        <BackButton href='/dashboard'>Dashboard</BackButton>
      </Reveal>
      <Reveal className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='font-heading text-4xl font-semibold tracking-tight'>
            Edit Plushies
          </h1>
          <p className='text-pretty text-muted-foreground'>
            Add new friends or update the ones you have.
          </p>
        </div>
        <Button asChild>
          <Link href='/dashboard/plushies/new'>
            <PlusIcon />
            New Plushie
          </Link>
        </Button>
      </Reveal>

      {/* The card rises as a whole, then its rows fade in without moving, so
          nothing slides past the card's edge. */}
      <Reveal
        as='ul'
        className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'
      >
        {plushies.map((plushie) => (
          <Reveal
            as='li'
            direction='none'
            key={plushie.id}
            className='flex items-center gap-4 p-3'
          >
            <PlushiePhoto
              plushie={plushie}
              sizes='56px'
              compact
              className='size-14 shrink-0 rounded-xl'
            />
            <div className='min-w-0 flex-1'>
              <Link
                href={`/plushies/${plushie.slug}`}
                className='font-heading font-semibold hover:underline'
              >
                {plushie.name}
              </Link>
              <p className='text-sm text-muted-foreground'>
                {[
                  count(
                    plushie.gallery.length + (plushie.thumbnail ? 1 : 0),
                    'photo'
                  ),
                  count(plushie.likes, 'like'),
                ].join(' · ')}
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href={`/dashboard/plushies/${plushie.id}`}>
                <PencilIcon />
                Edit
              </Link>
            </Button>
          </Reveal>
        ))}
      </Reveal>
    </div>
  );
}
