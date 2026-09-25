import type { Metadata } from 'next';
import Link from 'next/link';

import { PencilIcon, PlusIcon } from 'lucide-react';

import { getPlushieList } from '@/data/dashboard';
import { requireEditor } from '@/lib/session';
import { cn, count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { LocalTime } from '@/components/local-time';
import { MissingBadges } from '@/components/missing-badges';
import { Reveal } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Edit Plushies' };

/** Ways to look at the list. The dashboard links straight to each. */
const views = {
  all: 'All',
  recent: 'Recently edited',
  attention: 'Needs attention',
} as const;

type View = keyof typeof views;

export default async function PlushiesPage(
  props: PageProps<'/dashboard/plushies'>
) {
  await requireEditor();
  const { view: viewParam } = await props.searchParams;
  const view: View =
    typeof viewParam === 'string' && Object.hasOwn(views, viewParam)
      ? (viewParam as View)
      : 'all';
  const all = await getPlushieList();
  const incomplete = all
    .filter((plushie) => plushie.missing.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const plushies =
    view === 'recent'
      ? all.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : view === 'attention'
        ? incomplete
        : all;
  const counts: Partial<Record<View, number>> = {
    all: all.length,
    attention: incomplete.length,
  };

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

      <Reveal
        as='nav'
        aria-label='Show'
        className='flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1'
      >
        {(Object.keys(views) as View[]).map((key) => (
          <Link
            key={key}
            href={
              key === 'all'
                ? '/dashboard/plushies'
                : `/dashboard/plushies?view=${key}`
            }
            aria-current={key === view ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              key === view
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {views[key]}
            {counts[key] !== undefined && (
              <span className='text-xs text-muted-foreground'>
                {counts[key]}
              </span>
            )}
          </Link>
        ))}
      </Reveal>

      {/* The card rises as a whole, then its rows fade in without moving, so
          nothing slides past the card's edge. */}
      {plushies.length > 0 ? (
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
                {view === 'attention' ? (
                  <MissingBadges missing={plushie.missing} />
                ) : view === 'recent' ? (
                  <p className='text-sm text-muted-foreground'>
                    {plushie.isNew ? 'Added' : 'Edited'}{' '}
                    <LocalTime iso={plushie.updatedAt} />
                    {plushie.editedBy && ` by ${plushie.editedBy}`}
                  </p>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    {count(plushie.photos, 'photo')} ·{' '}
                    {count(plushie.likes, 'like')}
                  </p>
                )}
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
      ) : (
        <Reveal
          as='p'
          className='rounded-xl p-4 text-sm text-muted-foreground ring-1 ring-foreground/10'
        >
          {view === 'attention'
            ? 'Every plushie is complete.'
            : 'No plushies yet.'}
        </Reveal>
      )}
    </div>
  );
}
