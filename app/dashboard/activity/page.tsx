import type { Metadata } from 'next';
import Link from 'next/link';

import { getActivity } from '@/data/activity';
import { ACTIVITY_DAYS, ActivitySubject } from '@/lib/activity';
import { isAdmin } from '@/lib/permissions';
import { requireEditor } from '@/lib/session';

import { ActivityEntry } from '@/components/activity-entry';
import { BackButton } from '@/components/back-button';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Activity' };

const filters = [
  { show: undefined, label: 'All' },
  { show: 'plushies', label: 'Plushies' },
  { show: 'users', label: 'Users' },
] as const;

export default async function ActivityPage(
  props: PageProps<'/dashboard/activity'>
) {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);
  const { show } = await props.searchParams;
  // Editors only see plushie changes; account changes are for admins.
  const subject =
    !admin || show === 'plushies'
      ? ActivitySubject.PLUSHIE
      : show === 'users'
        ? ActivitySubject.USER
        : undefined;

  const { entries, context } = await getActivity({
    subject,
    canRevertAccounts: admin,
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
            ? `Changes to plushies and accounts from the last ${ACTIVITY_DAYS} days.`
            : `Changes to plushies from the last ${ACTIVITY_DAYS} days.`}
        </p>
      </Reveal>

      {admin && (
        <Reveal as='header' className='flex gap-1'>
          {filters.map((filter) => (
            <Button
              key={filter.label}
              variant={filter.show === show ? 'secondary' : 'ghost'}
              size='sm'
              asChild
            >
              <Link
                href={
                  filter.show
                    ? `/dashboard/activity?show=${filter.show}`
                    : '/dashboard/activity'
                }
                aria-current={filter.show === show ? 'page' : undefined}
              >
                {filter.label}
              </Link>
            </Button>
          ))}
        </Reveal>
      )}

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
        <Reveal
          as='p'
          className='rounded-xl p-8 text-center text-pretty text-muted-foreground ring-1 ring-foreground/10'
        >
          Nothing yet. Changes show up here as they happen.
        </Reveal>
      )}
    </div>
  );
}
