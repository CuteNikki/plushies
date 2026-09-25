import type { Metadata } from 'next';

import { FlagIcon } from 'lucide-react';

import { getOpenReports, type OpenReport } from '@/data/reports';
import { Role } from '@/lib/generated/prisma/enums';
import { isAdmin } from '@/lib/permissions';
import {
  REPORT_WINDOW_HOURS,
  reportReasons,
  REPORTS_TO_HIDE,
} from '@/lib/report-rules';
import { requireEditor } from '@/lib/session';
import { count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { CommentAuthor } from '@/components/comment-author';
import { CommentRow } from '@/components/comment-row';
import { EmptyState } from '@/components/empty-state';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { ReportActions } from '@/components/report-actions';

export const metadata: Metadata = { title: 'Reports' };

export default async function ReportsPage() {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);
  const viewer = { id: session.user.id, admin };
  const reported = await getOpenReports();

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
          {reported.length > 0
            ? `${count(reported.length, 'reported comment')} to look at.`
            : 'Comments people reported show up here.'}{' '}
          {count(REPORTS_TO_HIDE, 'report')} in {REPORT_WINDOW_HOURS} hours hide
          a comment until it’s kept or deleted.
        </p>
      </Reveal>

      {reported.length > 0 ? (
        // The card rises as a whole, then its rows fade in without moving.
        <Reveal
          as='ul'
          className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'
        >
          {reported.map((item) => (
            <CommentRow
              key={item.comment.id}
              comment={item.comment}
              viewer={viewer}
              reportsPage
            >
              <div className='flex flex-col gap-3'>
                <Reports item={item} admin={admin} />
                <ReportActions
                  comment={{
                    id: item.comment.id,
                    replies: item.comment.replies,
                  }}
                  author={item.author}
                  viewer={viewer}
                  canBan={canBan(item.author, session.user.id, admin)}
                />
              </div>
            </CommentRow>
          ))}
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={FlagIcon}>Nothing reported right now.</EmptyState>
        </Reveal>
      )}
    </div>
  );
}

/**
 * Whether they can ban the author from here: editors only regular accounts,
 * admins anyone but admins. Never themselves, or someone banned already.
 */
function canBan(
  author: OpenReport['author'],
  viewerId: string,
  admin: boolean
) {
  if (!author || author.id === viewerId || author.banned) return false;
  if (author.role === Role.ADMIN) return false;
  return author.role === Role.USER || admin;
}

/** Why each person reported it, newest first. */
function Reports({ item, admin }: { item: OpenReport; admin: boolean }) {
  return (
    <ul className='flex flex-col gap-2 rounded-lg bg-muted/50 p-3 text-sm'>
      {item.reports.map((report) => (
        <li key={report.id} className='flex flex-col gap-0.5'>
          <p>
            <span className='font-semibold'>
              {reportReasons[report.reason].label}
            </span>
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
