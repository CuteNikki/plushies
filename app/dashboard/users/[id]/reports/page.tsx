import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FlagIcon } from 'lucide-react';

import { getReportsForUser, reportsIn } from '@/data/reports';
import { getUserName } from '@/data/users';
import {
  CARD_PAGE_SIZES,
  pageNumber,
  pageSize,
  plainQuery,
  withQuery,
} from '@/lib/list-params';
import { requireAdmin } from '@/lib/session';
import { cn } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { Reveal } from '@/components/motion';
import { Pagination } from '@/components/pagination';
import { ReportCaseCard } from '@/components/report-history';
import { UserSubpageHeader } from '@/components/user-subpage';

export const metadata: Metadata = { title: 'Reports' };

/**
 * Every report to do with someone, open or closed, newest first: about them
 * or their comments, or sent by them.
 */
export default async function UserReportsPage(
  props: PageProps<'/dashboard/users/[id]/reports'>
) {
  await requireAdmin();
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const sent = searchParams.show === 'sent';
  const query = plainQuery(searchParams);
  const page = pageNumber(searchParams.page);
  const take = pageSize(searchParams.per, CARD_PAGE_SIZES);
  const [user, reports] = await Promise.all([
    getUserName(id),
    getReportsForUser(id),
  ]);
  if (!user) notFound();
  const cases = sent ? reports.sent : reports.about;
  const shown = cases.slice((page - 1) * take, page * take);
  // A tab keeps the page size, and starts at page 1.
  const href = (next: { sent: boolean }) =>
    withQuery(`/dashboard/users/${id}/reports`, {
      ...query,
      page: null,
      show: next.sent ? 'sent' : null,
    });
  const tabs = [
    {
      label: 'Received',
      count: reportsIn(reports.about),
      href: href({ sent: false }),
      current: !sent,
    },
    {
      label: 'Sent',
      count: reportsIn(reports.sent),
      href: href({ sent: true }),
      current: sent,
    },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <UserSubpageHeader
        user={user}
        title={`Reports and ${user.name}`}
        description='About them or their comments, and ones they sent. Open and closed, the latest first; open ones are dealt with on the reports page.'
      />
      <Reveal
        as='nav'
        aria-label='Show'
        className='flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1'
      >
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={tab.current ? 'page' : undefined}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              tab.current
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            <span className='text-xs text-muted-foreground'>{tab.count}</span>
          </Link>
        ))}
      </Reveal>
      {shown.length > 0 ? (
        <Reveal as='ul' className='flex flex-col gap-4'>
          {shown.map((item) => (
            <ReportCaseCard key={item.key} item={item} />
          ))}
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={FlagIcon}>
            {page > 1
              ? 'No more reports.'
              : sent
                ? 'They haven’t reported anything.'
                : 'No one has reported them or their comments.'}
          </EmptyState>
        </Reveal>
      )}
      <Pagination
        query={query}
        page={page}
        total={cases.length}
        sizes={CARD_PAGE_SIZES}
      />
    </div>
  );
}
