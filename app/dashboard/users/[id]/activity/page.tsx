import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { HistoryIcon } from 'lucide-react';

import { getActivity } from '@/data/activity';
import { getUserName } from '@/data/users';
import { ACTIVITY_DAYS } from '@/lib/activity';
import { withQuery } from '@/lib/list-params';
import { requireAdmin } from '@/lib/session';

import { ActivityEntry } from '@/components/activity-entry';
import { EmptyState } from '@/components/empty-state';
import { Reveal } from '@/components/motion';
import { Pagination } from '@/components/pagination';
import { UserSubpageHeader } from '@/components/user-subpage';

export const metadata: Metadata = { title: 'Activity' };

/**
 * Changes to someone's account and changes they made, newest first, a page
 * at a time.
 */
export default async function UserActivityPage(
  props: PageProps<'/dashboard/users/[id]/activity'>
) {
  await requireAdmin();
  const { id } = await props.params;
  const { before } = await props.searchParams;
  // The last entry of the page before.
  const cursor = typeof before === 'string' ? before : null;
  const [user, { entries, context, next }] = await Promise.all([
    getUserName(id),
    getActivity({ userId: id, admin: true, cursor }),
  ]);
  if (!user) notFound();
  const pageHref = (before: string | null) =>
    withQuery(`/dashboard/users/${id}/activity`, { before });

  return (
    <div className='flex flex-col gap-6'>
      <UserSubpageHeader
        user={user}
        title={`${user.name}’s activity`}
        description={`Changes to this account and changes they made, from the last ${ACTIVITY_DAYS} days.`}
      />
      {entries.length > 0 ? (
        <Reveal
          as='ul'
          className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'
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
          <EmptyState icon={HistoryIcon}>
            {cursor
              ? 'No more changes.'
              : `Nothing in the last ${ACTIVITY_DAYS} days.`}
          </EmptyState>
        </Reveal>
      )}
      <Pagination
        newest={cursor ? pageHref(null) : null}
        older={next ? pageHref(next) : null}
        olderLabel='Older changes'
      />
    </div>
  );
}
