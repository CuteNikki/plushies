import type { Metadata } from 'next';
import Link from 'next/link';

import {
  CakeIcon,
  HeartIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
} from 'lucide-react';

import { getPlushieList } from '@/data/dashboard';
import {
  formatBirthday,
  formatWhen,
  sortByNextBirthday,
  type NextBirthday,
} from '@/lib/birthday';
import { oneOf, plainQuery, searchQuery, withQuery } from '@/lib/list-params';
import { requireEditor } from '@/lib/session';
import { cn, count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { EmptyState } from '@/components/empty-state';
import { ListControls } from '@/components/list-controls';
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
  birthdays: 'Birthdays',
} as const;

type View = keyof typeof views;

/** Orders for the All tab; the others have their own. */
const sorts = [
  'oldest',
  'newest',
  'name',
  'likes',
  'comments',
  'photos',
] as const;

export default async function PlushiesPage(
  props: PageProps<'/dashboard/plushies'>
) {
  await requireEditor();
  const searchParams = await props.searchParams;
  const { view: viewParam } = searchParams;
  const view: View =
    typeof viewParam === 'string' && Object.hasOwn(views, viewParam)
      ? (viewParam as View)
      : 'all';
  const query = plainQuery(searchParams);
  const q = searchQuery(searchParams.q)?.toLowerCase();
  const sort = oneOf(searchParams.sort, sorts);
  // Every tab only shows plushies whose name or species matches the search.
  const all = (await getPlushieList()).filter(
    (plushie) =>
      !q ||
      plushie.name.toLowerCase().includes(q) ||
      !!plushie.species?.toLowerCase().includes(q)
  );
  const inOrder = {
    oldest: all,
    newest: all.toReversed(),
    name: all.toSorted((a, b) => a.name.localeCompare(b.name)),
    likes: all.toSorted((a, b) => b.likes - a.likes),
    comments: all.toSorted((a, b) => b.comments - a.comments),
    photos: all.toSorted((a, b) => b.photos - a.photos),
  }[sort];
  const incomplete = all
    .filter((plushie) => plushie.missing.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  const withBirthday = sortByNextBirthday(
    all.flatMap((plushie) =>
      plushie.birthday ? [{ ...plushie, birthday: plushie.birthday }] : []
    )
  );
  const nextBirthdays = new Map(
    withBirthday.map((plushie) => [plushie.id, plushie.next])
  );
  const plushies =
    view === 'recent'
      ? all.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : view === 'attention'
        ? incomplete
        : view === 'birthdays'
          ? withBirthday
          : inOrder;
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
            href={withQuery('/dashboard/plushies', {
              q: query.q ?? null,
              sort: query.sort ?? null,
              view: key === 'all' ? null : key,
            })}
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

      <Reveal>
        <ListControls
          query={query}
          search={{
            label: 'Search plushies',
            placeholder: 'Search names or species',
          }}
          selects={
            view === 'all'
              ? [
                  {
                    param: 'sort',
                    label: 'Order',
                    options: [
                      { value: 'oldest', label: 'Oldest first' },
                      { value: 'newest', label: 'Newest first' },
                      { value: 'name', label: 'Name A–Z' },
                      { value: 'likes', label: 'Most liked' },
                      { value: 'comments', label: 'Most comments' },
                      { value: 'photos', label: 'Most photos' },
                    ],
                  },
                ]
              : []
          }
        />
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
                  className='block truncate font-heading font-semibold hover:underline'
                >
                  {plushie.name}
                </Link>
                {view === 'attention' ? (
                  <MissingBadges missing={plushie.missing} />
                ) : view === 'birthdays' && plushie.birthday ? (
                  <p className='text-sm text-muted-foreground'>
                    {birthdayLine(
                      plushie.birthday,
                      nextBirthdays.get(plushie.id) ?? null
                    )}
                  </p>
                ) : view === 'recent' ? (
                  <p className='text-sm text-muted-foreground'>
                    {plushie.isNew ? 'Added' : 'Edited'}{' '}
                    <LocalTime iso={plushie.updatedAt} />
                    {plushie.editedBy && ` by ${plushie.editedBy}`}
                  </p>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    {count(plushie.photos, 'photo')} ·{' '}
                    {count(plushie.likes, 'like')} ·{' '}
                    {count(plushie.comments, 'comment')}
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
        <Reveal>
          {q ? (
            <EmptyState icon={SearchIcon}>No plushies match.</EmptyState>
          ) : view === 'attention' ? (
            <EmptyState icon={SparklesIcon}>
              Every plushie is complete.
            </EmptyState>
          ) : view === 'birthdays' ? (
            <EmptyState icon={CakeIcon}>
              No plushie has a birthday yet.
            </EmptyState>
          ) : (
            <EmptyState icon={HeartIcon}>No plushies yet.</EmptyState>
          )}
        </Reveal>
      )}
    </div>
  );
}

/**
 * e.g. 'Turns 4 in 12 days · Born April 2, 2021'. Year-only birthdays have
 * no date to count to, so just 'Born 2021'.
 */
function birthdayLine(birthday: string, next: NextBirthday | null) {
  const born = `Born ${formatBirthday(birthday)}`;
  if (!next || next.turns < 1) return born;
  return `Turns ${next.turns} ${formatWhen(next)} · ${born}`;
}
