import Link from 'next/link';

import { ArrowRightIcon } from 'lucide-react';

import type {
  ClosedReport,
  ClosedUserReport,
  ReportCase,
} from '@/data/reports';
import {
  reportOutcomes,
  reportReasons,
  userReportOutcomes,
  userReportReasons,
} from '@/lib/report-rules';

import { LocalTime } from '@/components/local-time';
import {
  AccountSubject,
  CommentSubject,
  ReportCard,
} from '@/components/report-card';
import { Button } from '@/components/ui/button';

/** Comment reports closed together, e.g. by one Keep. */
export function ClosedReportItem({
  item,
  admin,
}: {
  item: ClosedReport;
  admin: boolean;
}) {
  return (
    <ReportCard
      kind='comment'
      admin={admin}
      status={{
        open: false,
        outcome: reportOutcomes[item.outcome],
        resolvedAt: item.resolvedAt,
        resolvedBy: item.resolvedBy,
      }}
      subject={<CommentSubject comment={item.comment} admin={admin} />}
      reports={item.reports.map((report) => ({
        ...report,
        reason: reportReasons[report.reason].label,
      }))}
    />
  );
}

/**
 * Account reports closed together, e.g. by one Dismiss. Under the name they
 * had when reported, with what it is now if that changed, e.g. after a reset.
 */
export function ClosedUserReportItem({
  item,
  admin,
}: {
  item: ClosedUserReport;
  admin: boolean;
}) {
  return (
    <ReportCard
      kind='user'
      admin={admin}
      status={{
        open: false,
        outcome: userReportOutcomes[item.outcome],
        resolvedAt: item.resolvedAt,
        resolvedBy: item.resolvedBy,
      }}
      subject={<ReportedAccount user={item.user} admin={admin} />}
      reports={item.reports.map((report) => ({
        ...report,
        reason: userReportReasons[report.reason].label,
      }))}
    />
  );
}

/**
 * A reported account, under the name it had then: when it joined, and what
 * it's called now if that changed, or that it's gone.
 */
function ReportedAccount({
  user,
  admin,
}: {
  user: {
    id: string;
    reportedName: string;
    /** Null once the account is gone. */
    name: string | null;
    image: string | null;
    joinedAt: string | null;
  };
  admin: boolean;
}) {
  return (
    <AccountSubject
      user={{
        id: user.id,
        name: user.reportedName,
        image: user.image,
        exists: user.name !== null,
      }}
      admin={admin}
      details={
        user.name === null ? (
          'Account deleted'
        ) : (
          <>
            {user.joinedAt && (
              <span>
                Joined <LocalTime iso={user.joinedAt} />
              </span>
            )}
            {user.name !== user.reportedName && (
              <span>· Now called {user.name}</span>
            )}
          </>
        )
      }
    />
  );
}

/**
 * A card on someone's page, like the reports page's: reports about them or
 * sent by them, open or closed. Open ones are dealt with on the reports
 * page, which it links to.
 */
export function ReportCaseCard({ item }: { item: ReportCase }) {
  const common = {
    // Only admins have the users pages.
    admin: true,
    actions: item.status.open && (
      <Button variant='outline' size='sm' className='self-start' asChild>
        <Link
          href={
            item.kind === 'comment'
              ? '/dashboard/reports?show=comments'
              : '/dashboard/reports?show=users'
          }
        >
          Deal with it on the reports page
          <ArrowRightIcon />
        </Link>
      </Button>
    ),
  };
  if (item.kind === 'comment') {
    return (
      <ReportCard
        {...common}
        kind='comment'
        status={
          item.status.open
            ? item.status
            : { ...item.status, outcome: reportOutcomes[item.outcome!] }
        }
        subject={<CommentSubject comment={item.comment} admin />}
        reports={item.reports.map((report) => ({
          ...report,
          reason: reportReasons[report.reason].label,
        }))}
      />
    );
  }
  return (
    <ReportCard
      {...common}
      kind='user'
      status={
        item.status.open
          ? item.status
          : { ...item.status, outcome: userReportOutcomes[item.outcome!] }
      }
      subject={<ReportedAccount user={item.user} admin />}
      reports={item.reports.map((report) => ({
        ...report,
        reason: userReportReasons[report.reason].label,
      }))}
    />
  );
}
