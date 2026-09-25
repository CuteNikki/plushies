import type { Metadata } from 'next';
import Link from 'next/link';

import { FlagIcon, UserRoundXIcon } from 'lucide-react';

import {
  getOpenReports,
  getOpenUserReports,
  type OpenReport,
  type OpenUserReport,
} from '@/data/reports';
import { Role } from '@/lib/generated/prisma/enums';
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
import { CommentAuthor } from '@/components/comment-author';
import { CommentRow } from '@/components/comment-row';
import { EmptyState } from '@/components/empty-state';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { PrivateText } from '@/components/private-text';
import { ReportActions } from '@/components/report-actions';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { UserReportActions } from '@/components/user-report-actions';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage(
  props: PageProps<'/dashboard/reports'>
) {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);
  const viewer = { id: session.user.id, admin };
  const { show } = await props.searchParams;
  const showUsers = show === 'users';
  const [comments, users] = await Promise.all([
    getOpenReports(),
    getOpenUserReports({ admin }),
  ]);

  const tabs = [
    { key: 'comments', label: 'Comments', count: comments.length },
    { key: 'users', label: 'Users', count: users.length },
  ];

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
          {showUsers
            ? 'Accounts people reported, e.g. for their name or picture.'
            : `Comments people reported. ${count(REPORTS_TO_HIDE, 'report')} in ${REPORT_WINDOW_HOURS} hours hide a comment until it’s kept or deleted.`}
        </p>
      </Reveal>

      <Reveal
        as='nav'
        aria-label='Show'
        className='flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-muted p-1'
      >
        {tabs.map((tab) => {
          const current = (tab.key === 'users') === showUsers;
          return (
            <Link
              key={tab.key}
              href={
                tab.key === 'users'
                  ? '/dashboard/reports?show=users'
                  : '/dashboard/reports'
              }
              aria-current={current ? 'page' : undefined}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                current
                  ? 'bg-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
              <span className='text-xs text-muted-foreground'>{tab.count}</span>
            </Link>
          );
        })}
      </Reveal>

      {showUsers ? (
        users.length > 0 ? (
          <Reveal
            as='ul'
            className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'
          >
            {users.map((item) => (
              <Reveal
                as='li'
                direction='none'
                key={item.user.id}
                className='flex items-start gap-3 p-4'
              >
                <UserReportRow
                  item={item}
                  admin={admin}
                  canAct={canActOn(item.user, session.user.id, admin)}
                />
              </Reveal>
            ))}
          </Reveal>
        ) : (
          <Reveal>
            <EmptyState icon={UserRoundXIcon}>
              No accounts reported right now.
            </EmptyState>
          </Reveal>
        )
      ) : comments.length > 0 ? (
        // The card rises as a whole, then its rows fade in without moving.
        <Reveal
          as='ul'
          className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'
        >
          {comments.map((item) => (
            <CommentRow
              key={item.comment.id}
              comment={item.comment}
              viewer={viewer}
              reportsPage
            >
              <div className='flex flex-col gap-3'>
                <ReportList
                  reports={item.reports.map((report) => ({
                    ...report,
                    reason: reportReasons[report.reason].label,
                  }))}
                  admin={admin}
                />
                <ReportActions
                  comment={{
                    id: item.comment.id,
                    replies: item.comment.replies,
                  }}
                  author={item.author}
                  viewer={viewer}
                  canBan={
                    !!item.author &&
                    !item.author.banned &&
                    canActOn(item.author, session.user.id, admin)
                  }
                />
              </div>
            </CommentRow>
          ))}
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={FlagIcon}>
            No comments reported right now.
          </EmptyState>
        </Reveal>
      )}
    </div>
  );
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

/** A reported account: who it is, why they were reported, what to do. */
function UserReportRow({
  item,
  admin,
  canAct,
}: {
  item: OpenUserReport;
  admin: boolean;
  canAct: boolean;
}) {
  const { user } = item;
  return (
    <>
      <span className='flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-primary/20'>
        <UserAvatar user={user} />
      </span>
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          {/* Only admins have the users pages. */}
          {admin ? (
            <Link
              href={`/dashboard/users/${user.id}`}
              className='truncate font-heading font-semibold hover:underline'
            >
              {user.name}
            </Link>
          ) : (
            <span className='truncate font-heading font-semibold'>
              {user.name}
            </span>
          )}
          {user.role !== Role.USER && (
            <Badge variant='secondary'>{roleLabels[user.role]}</Badge>
          )}
          {user.banned && <Badge variant='destructive'>Banned</Badge>}
        </div>
        <div className='flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground'>
          {user.email && (
            <>
              <PrivateText className='w-fit'>{user.email}</PrivateText>
              <span>·</span>
            </>
          )}
          <span>
            Joined <LocalTime iso={user.createdAt} />
          </span>
        </div>
        <div className='mt-2 flex flex-col gap-3'>
          <ReportList
            reports={item.reports.map((report) => ({
              ...report,
              reason: userReportReasons[report.reason].label,
            }))}
            admin={admin}
          />
          <UserReportActions
            user={{
              id: user.id,
              name: user.name,
              image: user.image,
              banned: user.banned,
            }}
            canAct={canAct}
          />
        </div>
      </div>
    </>
  );
}

/** Why each person reported it, newest first. */
function ReportList({
  reports,
  admin,
}: {
  reports: {
    id: string;
    reason: string;
    note: string | null;
    createdAt: string;
    reporter: { id: string; name: string } | null;
  }[];
  admin: boolean;
}) {
  return (
    <ul className='flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm'>
      {reports.map((report) => (
        <li key={report.id} className='flex flex-col gap-0.5'>
          <p>
            <span className='font-semibold'>{report.reason}</span>
            <span className='text-muted-foreground'>
              {' · '}
              <CommentAuthor author={report.reporter} link={admin} />
              {' · '}
              <LocalTime iso={report.createdAt} />
            </span>
          </p>
          {report.note && (
            <p className='wrap-break-word whitespace-pre-line text-muted-foreground'>
              {report.note}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
