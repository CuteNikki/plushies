import type { Metadata } from 'next';
import Link from 'next/link';

import { EyeOffIcon, FlagIcon, UserRoundXIcon } from 'lucide-react';

import {
  getClosedReports,
  getClosedUserReports,
  getOpenReports,
  getOpenUserReports,
  type OpenReport,
  type OpenUserReport,
} from '@/data/reports';
import { Role } from '@/lib/generated/prisma/enums';
import {
  CARD_PAGE_SIZES,
  matchesSearch,
  oneOf,
  pageNumber,
  pageSize,
  plainQuery,
  searchQuery,
  withQuery,
} from '@/lib/list-params';
import { isAdmin, roleLabels } from '@/lib/permissions';
import {
  REPORT_WINDOW_HOURS,
  reportReasons,
  REPORTS_TO_HIDE,
  userReportReasons,
} from '@/lib/report-rules';
import { requireEditor } from '@/lib/session';
import { cn, count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { EmptyState } from '@/components/empty-state';
import { ListControls } from '@/components/list-controls';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { Pagination } from '@/components/pagination';
import { ReportActions } from '@/components/report-actions';
import {
  AccountSubject,
  CommentSubject,
  ReportCard,
} from '@/components/report-card';
import {
  ClosedReportItem,
  ClosedUserReportItem,
} from '@/components/report-history';
import { Badge } from '@/components/ui/badge';
import { UserReportActions } from '@/components/user-report-actions';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage(
  props: PageProps<'/dashboard/reports'>
) {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);
  const viewer = { id: session.user.id, admin };
  const searchParams = await props.searchParams;
  const { show, status } = searchParams;
  const query = plainQuery(searchParams);
  const q = searchQuery(searchParams.q);
  const sort = oneOf(searchParams.sort, reportSorts);
  const page = pageNumber(searchParams.page);
  const take = pageSize(searchParams.per, CARD_PAGE_SIZES);
  // Both kinds unless one is picked.
  const kind: Kind = show === 'comments' || show === 'users' ? show : 'all';
  const closed = status === 'closed';
  const [comments, users, closedComments, closedUsers] = await Promise.all([
    getOpenReports(),
    getOpenUserReports(),
    // Only the history being looked at.
    closed && kind !== 'users' ? getClosedReports() : null,
    closed && kind !== 'comments' ? getClosedUserReports() : null,
  ]);

  // A tab keeps the search, order and page size, and starts at page 1.
  const href = (next: { kind?: Kind; closed?: boolean }) => {
    const nextKind = next.kind ?? kind;
    return withQuery('/dashboard/reports', {
      ...query,
      page: null,
      show: nextKind === 'all' ? null : nextKind,
      status: (next.closed ?? closed) ? 'closed' : null,
    });
  };
  const tabs = (
    [
      ['all', 'All', comments.length + users.length],
      ['comments', 'Comments', comments.length],
      ['users', 'Users', users.length],
    ] as const
  ).map(([key, label, open]) => ({
    label,
    count: open,
    href: href({ kind: key }),
    current: kind === key,
  }));
  const statuses = [
    { label: 'Open', href: href({ closed: false }), current: !closed },
    { label: 'Closed', href: href({ closed: true }), current: closed },
  ];

  // One list, newest first, of what's picked: open reports by their latest
  // report, closed ones by when they were closed.
  const commentRows: Row[] = closedComments
    ? closedComments.map((item) => ({
        at: item.resolvedAt,
        reports: item.reports.length,
        text: [
          item.comment.body,
          item.comment.author?.name,
          item.comment.plushie.name,
          item.resolvedBy?.name,
          ...reportTexts(item.reports, reportReasons),
        ],
        node: (
          <ClosedReportItem key={`c:${item.key}`} item={item} admin={admin} />
        ),
      }))
    : comments.map((item) => ({
        at: item.reports[0].createdAt,
        reports: item.reports.length,
        text: [
          item.comment.body,
          item.author?.name,
          item.comment.plushie.name,
          ...reportTexts(item.reports, reportReasons),
        ],
        node: (
          <ReportCard
            key={`c:${item.comment.id}`}
            kind='comment'
            admin={admin}
            status={{
              open: true,
              reports: item.reports.length,
              latestAt: item.reports[0].createdAt,
            }}
            flags={
              item.comment.hidden && (
                <Badge
                  variant='destructive'
                  title='Hidden until it’s kept or deleted'
                >
                  <EyeOffIcon />
                  Hidden
                </Badge>
              )
            }
            subject={
              <CommentSubject
                comment={{
                  ...item.comment,
                  author: item.author,
                  exists: true,
                }}
                admin={admin}
                badges={
                  item.author && (
                    <>
                      {item.author.role !== Role.USER && (
                        <Badge variant='secondary'>
                          {roleLabels[item.author.role]}
                        </Badge>
                      )}
                      {item.author.banned && (
                        <Badge variant='destructive'>Banned</Badge>
                      )}
                    </>
                  )
                }
              />
            }
            reports={item.reports.map((report) => ({
              ...report,
              reason: reportReasons[report.reason].label,
            }))}
            actions={
              <ReportActions
                comment={{ id: item.comment.id, replies: item.comment.replies }}
                author={item.author}
                viewer={viewer}
                canBan={
                  !!item.author &&
                  !item.author.banned &&
                  canActOn(item.author, session.user.id, admin)
                }
              />
            }
          />
        ),
      }));
  const userRows: Row[] = closedUsers
    ? closedUsers.map((item) => ({
        at: item.resolvedAt,
        reports: item.reports.length,
        text: [
          item.user.reportedName,
          item.user.name,
          item.resolvedBy?.name,
          ...reportTexts(item.reports, userReportReasons),
        ],
        node: (
          <ClosedUserReportItem
            key={`u:${item.key}`}
            item={item}
            admin={admin}
          />
        ),
      }))
    : users.map(({ user, reports }) => ({
        at: reports[0].createdAt,
        reports: reports.length,
        text: [user.name, ...reportTexts(reports, userReportReasons)],
        node: (
          <ReportCard
            key={`u:${user.id}`}
            kind='user'
            admin={admin}
            status={{
              open: true,
              reports: reports.length,
              latestAt: reports[0].createdAt,
            }}
            flags={user.banned && <Badge variant='destructive'>Banned</Badge>}
            subject={
              <AccountSubject
                user={{ ...user, exists: true }}
                admin={admin}
                badges={
                  user.role !== Role.USER && (
                    <Badge variant='secondary'>{roleLabels[user.role]}</Badge>
                  )
                }
                details={
                  <span>
                    Joined <LocalTime iso={user.createdAt} />
                  </span>
                }
              />
            }
            reports={reports.map((report) => ({
              ...report,
              reason: userReportReasons[report.reason].label,
            }))}
            actions={
              <UserReportActions
                user={{
                  id: user.id,
                  name: user.name,
                  image: user.image,
                  banned: user.banned,
                }}
                reasons={reports.map((report) => report.reason)}
                canAct={canActOn(user, session.user.id, admin)}
              />
            }
          />
        ),
      }));
  const newest = (a: Row, b: Row) => b.at.localeCompare(a.at);
  const rows = [
    ...(kind !== 'users' ? commentRows : []),
    ...(kind !== 'comments' ? userRows : []),
  ]
    .filter((row) => matchesSearch(q, row.text))
    .sort(
      {
        newest,
        oldest: (a: Row, b: Row) => newest(b, a),
        most: (a: Row, b: Row) => b.reports - a.reports || newest(a, b),
      }[sort]
    );
  const shown = rows.slice((page - 1) * take, page * take);
  const what = { all: '', comments: ' comment', users: ' account' }[kind];
  const empty = q
    ? 'No reports match.'
    : page > 1
      ? 'No more reports.'
      : closed
        ? `No closed${what} reports yet.`
        : { all: 'Nothing', comments: 'No comments', users: 'No accounts' }[
            kind
          ] + ' reported right now.';

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex'>
        <BackButton href='/dashboard'>Dashboard</BackButton>
      </Reveal>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Reports
        </h1>
        <p className='text-pretty text-muted-foreground'>
          {closed
            ? 'What was done about reports, and by whom.'
            : kind === 'users'
              ? 'Accounts people reported, e.g. for their name or picture.'
              : `${kind === 'all' ? 'Comments and accounts' : 'Comments'} people reported. ${count(REPORTS_TO_HIDE, 'report')} in ${REPORT_WINDOW_HOURS} hours hide a comment until it’s kept or deleted.`}
        </p>
      </Reveal>

      <Reveal className='flex flex-wrap gap-2'>
        {/* What was reported, and whether it's still to do or done. The
            counts are what's open. */}
        <Segments label='Reported' items={tabs} />
        <Segments label='Status' items={statuses} />
      </Reveal>

      <Reveal>
        <ListControls
          query={query}
          search={{
            label: 'Search reports',
            placeholder: 'Search comments, names, plushies or notes',
          }}
          selects={[
            {
              param: 'sort',
              label: 'Order',
              options: [
                { value: 'newest', label: 'Latest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'most', label: 'Most reports' },
              ],
            },
          ]}
        />
      </Reveal>

      {shown.length > 0 ? (
        // A card per reported comment or account.
        <Reveal as='ul' className='flex flex-col gap-4'>
          {shown.map((row) => row.node)}
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={kind === 'users' ? UserRoundXIcon : FlagIcon}>
            {empty}
          </EmptyState>
        </Reveal>
      )}

      <Pagination
        query={query}
        page={page}
        total={rows.length}
        sizes={CARD_PAGE_SIZES}
      />
    </div>
  );
}

type Kind = 'all' | 'comments' | 'users';

/** Ordered by when it happened, or by how many reports there are. */
const reportSorts = ['newest', 'oldest', 'most'] as const;

/**
 * A card in the list, when it happened and how many reports it has, to sort
 * by, and what a search looks through.
 */
type Row = {
  at: string;
  reports: number;
  text: (string | null | undefined)[];
  node: React.ReactNode;
};

/** What a search finds in reports: who sent them, their notes and reasons. */
function reportTexts<Reason extends string>(
  reports: {
    reason: Reason;
    note: string | null;
    reporter: { name: string } | null;
  }[],
  reasons: Record<Reason, { label: string }>
) {
  return reports.flatMap((report) => [
    report.reporter?.name,
    report.note,
    reasons[report.reason].label,
  ]);
}

/**
 * Whether they can ban or reset someone from here: editors only regular
 * accounts, admins anyone but admins. Never themselves.
 */
function canActOn(
  target: NonNullable<OpenReport['author']> | OpenUserReport['user'],
  viewerId: string,
  admin: boolean
) {
  if (target.id === viewerId || target.role === Role.ADMIN) return false;
  return target.role === Role.USER || admin;
}

/** Links that pick one of a few views, like tabs. */
function Segments({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string; current: boolean; count?: number }[];
}) {
  return (
    <nav
      aria-label={label}
      className='flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1'
    >
      {items.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.current ? 'page' : undefined}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
            item.current
              ? 'bg-background shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className='text-xs text-muted-foreground'>{item.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
