import type { Metadata } from 'next';
import Link from 'next/link';

import { HistoryIcon } from 'lucide-react';

import { activitySorts, getActivity } from '@/data/activity';
import { ACTIVITY_DAYS, ActivitySubject } from '@/lib/activity';
import {
  oneOf,
  pageNumber,
  pageSize,
  plainQuery,
  searchQuery,
  withQuery,
} from '@/lib/list-params';
import { isAdmin } from '@/lib/permissions';
import { requireEditor } from '@/lib/session';

import { ActivityEntry } from '@/components/activity-entry';
import { BackButton } from '@/components/back-button';
import { EmptyState } from '@/components/empty-state';
import { ListControls } from '@/components/list-controls';
import { Reveal } from '@/components/motion';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Activity' };

type Filter = {
  /** The ?show= value; none for all. */
  show?: string;
  label: string;
  subjects?: ActivitySubject[];
  /** Account changes are only for admins. */
  adminOnly?: boolean;
};

const filters: Filter[] = [
  { label: 'All' },
  { show: 'plushies', label: 'Plushies', subjects: [ActivitySubject.PLUSHIE] },
  { show: 'comments', label: 'Comments', subjects: [ActivitySubject.COMMENT] },
  {
    show: 'users',
    label: 'Users',
    subjects: [ActivitySubject.USER],
    adminOnly: true,
  },
];

export default async function ActivityPage(
  props: PageProps<'/dashboard/activity'>
) {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);
  const searchParams = await props.searchParams;
  const { show } = searchParams;
  const query = plainQuery(searchParams);
  const page = pageNumber(searchParams.page);
  const take = pageSize(searchParams.per);
  const q = searchQuery(searchParams.q);
  const sort = oneOf(searchParams.sort, activitySorts);
  const shown = filters.filter((filter) => admin || !filter.adminOnly);
  const filter = shown.find((filter) => filter.show === show) ?? shown[0];
  const subjects: ActivitySubject[] | undefined =
    filter.subjects ??
    (admin ? undefined : [ActivitySubject.PLUSHIE, ActivitySubject.COMMENT]);

  const { entries, context, total } = await getActivity({
    subjects,
    admin,
    page,
    take,
    q,
    sort,
  });
  // A tab keeps the search, order and page size, and starts at page 1.
  const tabHref = (show?: string) =>
    withQuery('/dashboard/activity', {
      ...query,
      page: null,
      show: show ?? null,
    });

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex'>
        <BackButton href='/dashboard'>Dashboard</BackButton>
      </Reveal>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Activity
        </h1>
        <p className='text-pretty text-muted-foreground'>
          {admin
            ? `Changes to plushies and accounts, and deleted comments, from the last ${ACTIVITY_DAYS} days.`
            : `Changes to plushies, and deleted comments, from the last ${ACTIVITY_DAYS} days.`}
        </p>
      </Reveal>

      <Reveal as='header' className='flex flex-wrap gap-1'>
        {shown.map((option) => (
          <Button
            key={option.label}
            variant={option === filter ? 'secondary' : 'ghost'}
            size='sm'
            asChild
          >
            <Link
              href={tabHref(option.show)}
              aria-current={option === filter ? 'page' : undefined}
            >
              {option.label}
            </Link>
          </Button>
        ))}
      </Reveal>

      <Reveal>
        <ListControls
          query={query}
          search={{
            label: 'Search activity',
            placeholder: 'Search plushies, accounts or who did it',
          }}
          selects={[
            {
              param: 'sort',
              label: 'Order',
              options: [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
              ],
            },
          ]}
        />
      </Reveal>

      {entries.length > 0 ? (
        // The card rises as a whole, then its rows fade in without moving, so
        // nothing slides past the card's edge.
        <Reveal
          as='ul'
          className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'
        >
          {entries.map(({ entry, revert, revertedBy }) => (
            <Reveal as='li' direction='none' key={entry.id}>
              <ActivityEntry
                entry={entry}
                context={context}
                revert={revert}
                revertedBy={revertedBy}
              />
            </Reveal>
          ))}
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={HistoryIcon} className='p-8'>
            {q
              ? 'No changes match.'
              : page > 1
                ? 'No more changes.'
                : 'Nothing yet. Changes show up here as they happen.'}
          </EmptyState>
        </Reveal>
      )}

      <Pagination query={query} page={page} total={total} />
    </div>
  );
}
