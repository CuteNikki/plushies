import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  ChevronRightIcon,
  FlagIcon,
  HeartIcon,
  HistoryIcon,
  MessageCircleIcon,
} from 'lucide-react';

import { getActivity } from '@/data/activity';
import { toCommentRow } from '@/data/comment-rows';
import { getReportsForUser, reportsIn } from '@/data/reports';
import { getUser, USER_PAGE_SHOWN } from '@/data/users';
import { ACTIVITY_DAYS } from '@/lib/activity';
import { isBanned } from '@/lib/bans';
import { isAdmin } from '@/lib/permissions';
import { requireAdmin } from '@/lib/session';
import { count } from '@/lib/utils';

import { ActivityEntry } from '@/components/activity-entry';
import { BackButton } from '@/components/back-button';
import { BanForm, UnbanButton } from '@/components/ban-controls';
import { CommentRow } from '@/components/comment-row';
import { EmptyState } from '@/components/empty-state';
import { LikedPlushies } from '@/components/liked-plushies';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { PrivateText } from '@/components/private-text';
import { ReceivedSentReports } from '@/components/received-sent-reports';
import { ReportCaseCard } from '@/components/report-history';
import { RoleSelect } from '@/components/role-select';
import { Button } from '@/components/ui/button';
import { UserActions } from '@/components/user-actions';
import { UserBadges } from '@/components/user-badges';
import { UserContextMenu } from '@/components/user-context-menu';

// Not the name: metadata is worked out apart from the page's admin check.
export const metadata: Metadata = { title: 'User' };

export default async function UserPage(
  props: PageProps<'/dashboard/users/[id]'>
) {
  const session = await requireAdmin();
  const { id } = await props.params;
  const [user, activity, reports] = await Promise.all([
    getUser(id),
    getActivity({ userId: id, admin: true, take: USER_PAGE_SHOWN.activity }),
    getReportsForUser(id),
  ]);
  if (!user) notFound();

  const isYou = user.id === session.user.id;
  const page = `/dashboard/users/${user.id}`;
  const shownReports = {
    about: reports.about.slice(0, USER_PAGE_SHOWN.reports),
    sent: reports.sent.slice(0, USER_PAGE_SHOWN.reports),
  };
  const reportCount = {
    received: reportsIn(reports.about),
    sent: reportsIn(reports.sent),
  };
  const banned = isBanned(user);

  return (
    <div className='flex flex-col gap-8'>
      <div className='flex flex-col gap-6'>
        <Reveal className='flex'>
          <BackButton href='/dashboard/users'>Users</BackButton>
        </Reveal>
        <Reveal className='flex flex-wrap items-start justify-between gap-4'>
          <div className='flex min-w-0 flex-col gap-1.5'>
            <h1 className='font-heading text-4xl font-semibold tracking-tight wrap-break-word'>
              {user.name}
            </h1>
            <PrivateText className='w-fit text-muted-foreground'>
              {user.email}
            </PrivateText>
            <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
              <UserBadges
                user={user}
                passkeys={user.passkeys.length}
                banned={banned}
              />
              <span>
                Joined <LocalTime iso={user.createdAt.toISOString()} />
              </span>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <RoleSelect userId={user.id} role={user.role} disabled={isYou} />
            <UserActions
              user={{ id: user.id, name: user.name, role: user.role }}
              banned={banned}
              twoFactor={!!user.twoFactorEnabled}
              disabled={isYou}
              afterDelete='/dashboard/users'
            />
          </div>
        </Reveal>
      </div>

      {!isYou && (
        <Section
          title='Ban'
          description={
            banned
              ? undefined
              : 'Signs them out everywhere and stops them signing in. They see the reason, if you give one, when they try.'
          }
        >
          {banned ? (
            <div className='flex flex-col gap-3 rounded-xl bg-destructive/5 p-4 ring-1 ring-destructive/20'>
              <p className='text-sm'>
                Banned
                {user.bannedBy && (
                  <>
                    {' '}
                    by{' '}
                    <UserContextMenu user={user.bannedBy}>
                      <Link
                        href={`/dashboard/users/${user.bannedBy.id}`}
                        className='font-semibold hover:underline'
                      >
                        {user.bannedBy.name}
                      </Link>
                    </UserContextMenu>
                  </>
                )}
                {user.bannedAt && (
                  <>
                    {' '}
                    <LocalTime iso={user.bannedAt.toISOString()} />
                  </>
                )}
                {user.banExpires ? (
                  <>
                    , until{' '}
                    <LocalTime iso={user.banExpires.toISOString()} absolute />.
                  </>
                ) : (
                  ', until lifted.'
                )}
              </p>
              <p className='rounded-lg bg-background px-3 py-2 text-sm wrap-break-word whitespace-pre-line'>
                {user.banReason ?? (
                  <span className='text-muted-foreground italic'>
                    No reason given
                  </span>
                )}
              </p>
              <UnbanButton user={user} />
            </div>
          ) : isAdmin(user.role) ? (
            <p className='rounded-xl p-4 text-sm text-muted-foreground ring-1 ring-foreground/10'>
              Admins can&rsquo;t be banned. Make them an editor first.
            </p>
          ) : (
            <div className='rounded-xl p-4 ring-1 ring-foreground/10'>
              <BanForm user={user} />
            </div>
          )}
        </Section>
      )}

      <Section
        title='Likes'
        description={count(user._count.likes, 'plushie') + ' liked.'}
        more={user._count.likes > user.likes.length && `${page}/likes`}
      >
        {user.likes.length > 0 ? (
          <LikedPlushies
            plushies={user.likes.map(({ plushie }) => plushie)}
            preview
          />
        ) : (
          <EmptyState icon={HeartIcon}>No likes yet.</EmptyState>
        )}
      </Section>

      <Section
        title='Reports'
        description={`${count(reportCount.received, 'report')} about them or their comments, ${count(reportCount.sent, 'report')} sent by them.`}
      >
        <ReceivedSentReports
          received={{
            count: reportCount.received,
            more:
              reports.about.length > shownReports.about.length
                ? `${page}/reports`
                : null,
            list:
              shownReports.about.length > 0 ? (
                <ul className='flex flex-col gap-4'>
                  {shownReports.about.map((item) => (
                    <ReportCaseCard key={item.key} item={item} />
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FlagIcon}>
                  No one has reported them or their comments.
                </EmptyState>
              ),
          }}
          sent={{
            count: reportCount.sent,
            more:
              reports.sent.length > shownReports.sent.length
                ? `${page}/reports?show=sent`
                : null,
            list:
              shownReports.sent.length > 0 ? (
                <ul className='flex flex-col gap-4'>
                  {shownReports.sent.map((item) => (
                    <ReportCaseCard key={item.key} item={item} />
                  ))}
                </ul>
              ) : (
                <EmptyState icon={FlagIcon}>
                  They haven’t reported anything.
                </EmptyState>
              ),
          }}
        />
      </Section>

      <Section
        title='Comments'
        description={
          user._count.comments > user.comments.length
            ? `${count(user._count.comments, 'comment')}, the latest ${user.comments.length} shown.`
            : `${count(user._count.comments, 'comment')}.`
        }
        more={user._count.comments > user.comments.length && `${page}/comments`}
      >
        {user.comments.length > 0 ? (
          <ul className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'>
            {user.comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={toCommentRow(comment)}
                viewer={{ id: session.user.id, admin: true }}
                showAuthor={false}
              />
            ))}
          </ul>
        ) : (
          <EmptyState icon={MessageCircleIcon}>No comments yet.</EmptyState>
        )}
      </Section>

      <Section
        title='Activity'
        description={`Changes to this account and changes they made, from the last ${ACTIVITY_DAYS} days.`}
        more={activity.next && `${page}/activity`}
      >
        {activity.entries.length > 0 ? (
          <ul className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'>
            {activity.entries.map(({ entry, revert, revertedBy }) => (
              <li key={entry.id}>
                <ActivityEntry
                  entry={entry}
                  context={activity.context}
                  revert={revert}
                  revertedBy={revertedBy}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={HistoryIcon}>
            Nothing in the last {ACTIVITY_DAYS} days.
          </EmptyState>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  more,
  children,
}: {
  title: string;
  description?: string;
  /** Where all of it is, when this shows only the latest. */
  more?: string | false | null;
  children: React.ReactNode;
}) {
  return (
    <Reveal as='section' className='flex flex-col gap-4'>
      <div className='flex items-end justify-between gap-2'>
        <div>
          <h2 className='font-heading text-xl font-semibold'>{title}</h2>
          {description && (
            <p className='text-sm text-pretty text-muted-foreground'>
              {description}
            </p>
          )}
        </div>
        {more && (
          <Button variant='ghost' size='sm' className='shrink-0' asChild>
            <Link href={more}>
              Show all
              <ChevronRightIcon />
            </Link>
          </Button>
        )}
      </div>
      {children}
    </Reveal>
  );
}
