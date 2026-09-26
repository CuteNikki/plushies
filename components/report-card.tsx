import Link from 'next/link';

import { MessageCircleIcon, UserRoundIcon } from 'lucide-react';

import { mentionsToText } from '@/lib/mentions';
import { cn, count } from '@/lib/utils';

import { CommentAuthor } from '@/components/comment-author';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { PlushieContextMenu } from '@/components/plushie-menu';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/user-avatar';
import { UserContextMenu } from '@/components/user-context-menu';

type Person = { id: string; name: string } | null;

/** Where a report stands: still open, or what was done and by whom. */
export type ReportStatus =
  | { open: true; reports: number; latestAt: string }
  | {
      open: false;
      outcome: string;
      resolvedAt: string;
      resolvedBy: Person;
    };

/**
 * Everything about one reported comment or account, the same way every
 * time: a strip saying what it is and where it stands, then what was
 * reported, why, and what can be done while it's open.
 */
export function ReportCard({
  kind,
  status,
  flags,
  subject,
  reports,
  actions,
  admin,
}: {
  kind: 'comment' | 'user';
  status: ReportStatus;
  /** Badges at the end of the strip, e.g. Hidden or Banned. */
  flags?: React.ReactNode;
  /** What was reported. */
  subject: React.ReactNode;
  reports: ReportLine[];
  /** What to do about it, while it's open. */
  actions?: React.ReactNode;
  admin: boolean;
}) {
  const Icon = kind === 'comment' ? MessageCircleIcon : UserRoundIcon;
  return (
    <Reveal
      as='li'
      direction='none'
      className='overflow-hidden rounded-xl ring-1 ring-foreground/10'
    >
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-2 gap-y-1 border-b px-4 py-2 text-sm',
          status.open ? 'bg-primary/10' : 'bg-muted/50'
        )}
      >
        <span className='flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase'>
          <Icon className='size-3.5' aria-hidden />
          {kind === 'comment' ? 'Comment' : 'Account'}
        </span>
        <span className='text-muted-foreground'>·</span>
        {status.open ? (
          <span className='text-muted-foreground'>
            <span className='font-medium text-foreground'>
              {count(status.reports, 'open report')}
            </span>
            {' · latest '}
            <LocalTime iso={status.latestAt} />
          </span>
        ) : (
          <span className='flex flex-wrap items-center gap-x-1.5 text-muted-foreground'>
            <Badge variant='secondary'>{status.outcome}</Badge>
            {status.resolvedBy && (
              <span>
                by <CommentAuthor author={status.resolvedBy} link={admin} />
              </span>
            )}
            <LocalTime iso={status.resolvedAt} />
          </span>
        )}
        {flags && <span className='ml-auto flex gap-1.5'>{flags}</span>}
      </div>
      <div className='flex flex-col gap-4 p-4'>
        {/* The strip says what kind it is, so no heading of its own. */}
        {subject}
        <ReportTable reports={reports} admin={admin} />
        {actions}
      </div>
    </Reveal>
  );
}

export type ReportLine = {
  id: string;
  /** The reason, as the form put it. */
  reason: string;
  note: string | null;
  createdAt: string;
  reporter: Person;
};

/** Each report as a row: who sent it, why, when, and their note. */
function ReportTable({
  reports,
  admin,
}: {
  reports: ReportLine[];
  admin: boolean;
}) {
  const head =
    'pt-3 pb-1.5 pr-4 text-left text-xs font-semibold tracking-wide whitespace-nowrap text-muted-foreground uppercase last:pr-0';
  return (
    // Only as wide as what's in it, so the columns stay together; on a
    // narrow screen it scrolls sideways rather than squeezing them.
    <div className='overflow-x-auto border-t'>
      <table className='text-sm'>
        <thead>
          <tr>
            <th scope='col' className={head}>
              Reported by
            </th>
            <th scope='col' className={head}>
              Reason
            </th>
            <th scope='col' className={head}>
              When
            </th>
            <th scope='col' className={head}>
              Note
            </th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id} className='align-top'>
              <td className='py-1 pr-4 font-semibold whitespace-nowrap'>
                <CommentAuthor author={report.reporter} link={admin} />
              </td>
              <td className='py-1 pr-4 whitespace-nowrap'>{report.reason}</td>
              <td className='py-1 pr-4 whitespace-nowrap text-muted-foreground'>
                <LocalTime iso={report.createdAt} />
              </td>
              <td className='py-1 text-muted-foreground'>
                {/* Wraps once it's this wide, rather than spreading out. */}
                <p className='max-w-sm min-w-24 wrap-break-word whitespace-pre-line'>
                  {report.note ?? <span aria-label='No note'>—</span>}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ReportedPerson = {
  id: string;
  name: string;
  image?: string | null;
  /** False once the account is gone. */
  exists: boolean;
};

/**
 * Who was reported, or wrote what was: their picture and name, linked for
 * admins, and anything else about them underneath.
 */
function PersonLine({
  user,
  admin,
  badges,
  details,
}: {
  user: ReportedPerson;
  admin: boolean;
  badges?: React.ReactNode;
  details?: React.ReactNode;
}) {
  // Only admins have the users pages.
  const href = admin && user.exists ? `/dashboard/users/${user.id}` : null;
  const avatar =
    'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-primary/20';
  const line = (
    <div className='flex items-center gap-3'>
      {href ? (
        // Their picture goes there too; the name is the link to tab to.
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={cn(
            avatar,
            'transition-shadow hover:ring-2 hover:ring-primary/50'
          )}
        >
          <UserAvatar user={user} />
        </Link>
      ) : (
        <span className={avatar}>
          <UserAvatar user={user} />
        </span>
      )}
      <div className='flex min-w-0 flex-col gap-0.5'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
          {href ? (
            <Link
              href={href}
              className='truncate font-heading font-semibold hover:underline'
            >
              {user.name}
            </Link>
          ) : (
            <span className='truncate font-heading font-semibold'>
              {user.name}
            </span>
          )}
          {badges}
        </div>
        {details && (
          <div className='flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground'>
            {details}
          </div>
        )}
      </div>
    </div>
  );
  // Their picture and name open their account's actions on right-click.
  if (!user.exists) return line;
  return (
    <UserContextMenu user={user} as='div' className='w-fit'>
      {line}
    </UserContextMenu>
  );
}

/**
 * A reported comment: who wrote it, like a reported account, its text as
 * it was reported, and apart from that, the plushie it's on, linked to the
 * comment while it's still there.
 */
export function CommentSubject({
  comment,
  admin,
  badges,
}: {
  comment: {
    id: string;
    body: string;
    /** Null once their account is gone. */
    author: {
      id: string;
      name: string;
      image?: string | null;
      joinedAt?: string | null;
    } | null;
    plushie: {
      /** Null once the plushie is gone. */
      id: string | null;
      name: string;
      slug: string;
      thumbnail: { key: string; url: string } | null;
    };
    /** Whether it's still there to link to. */
    exists: boolean;
    createdAt?: string;
  };
  admin: boolean;
  /** Next to the author's name, e.g. their role. */
  badges?: React.ReactNode;
}) {
  const href = comment.exists
    ? `/plushies/${comment.plushie.slug}#comment-${comment.id}`
    : null;
  return (
    <div className='flex flex-col gap-3'>
      <PersonLine
        user={
          comment.author
            ? { ...comment.author, exists: true }
            : { id: '', name: 'A deleted account', exists: false }
        }
        admin={admin}
        badges={badges}
        details={
          comment.author?.joinedAt && (
            <span>
              Joined <LocalTime iso={comment.author.joinedAt} />
            </span>
          )
        }
      />
      <p className='rounded-lg bg-muted/50 px-3 py-2 text-sm wrap-break-word whitespace-pre-line'>
        {mentionsToText(comment.body)}
      </p>
      {/* Where it was posted, apart from what it says. */}
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground'>
        <span className='text-xs font-semibold tracking-wide uppercase'>
          Posted on
        </span>
        <PlushieLine plushie={comment.plushie}>
          {href ? (
            // Like the name; the name is the link to tab to.
            <Link href={href} tabIndex={-1} aria-hidden className='shrink-0'>
              <PlushiePhoto
                plushie={comment.plushie}
                sizes='24px'
                compact
                className='size-6 rounded-md transition hover:brightness-110'
              />
            </Link>
          ) : (
            <PlushiePhoto
              plushie={comment.plushie}
              sizes='24px'
              compact
              className='size-6 shrink-0 rounded-md'
            />
          )}
          {href ? (
            <Link
              href={href}
              className='font-semibold text-foreground hover:underline'
            >
              {comment.plushie.name}
            </Link>
          ) : (
            <span className='font-semibold text-foreground'>
              {comment.plushie.name}
            </span>
          )}
        </PlushieLine>
        {comment.createdAt && (
          <span>
            · <LocalTime iso={comment.createdAt} />
          </span>
        )}
        {!comment.exists && <span>· since deleted</span>}
      </div>
    </div>
  );
}

/** The plushie's photo and name, with its actions on right-click. */
function PlushieLine({
  plushie,
  children,
}: {
  plushie: { id: string | null; slug: string; name: string };
  children: React.ReactNode;
}) {
  const line = <span className='flex items-center gap-2'>{children}</span>;
  if (!plushie.id) return line;
  return (
    <PlushieContextMenu plushie={{ ...plushie, id: plushie.id }}>
      {line}
    </PlushieContextMenu>
  );
}

/** A reported account: who it is, like a comment's author. */
export function AccountSubject(props: {
  user: ReportedPerson;
  admin: boolean;
  badges?: React.ReactNode;
  details?: React.ReactNode;
}) {
  return <PersonLine {...props} />;
}
