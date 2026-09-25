import type { Metadata } from 'next';
import Link from 'next/link';

import {
  CakeIcon,
  ChevronRightIcon,
  HeartIcon,
  HistoryIcon,
  MessageCircleIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import {
  getDashboard,
  RECENT_DAYS,
  type DashboardPlushie,
} from '@/data/dashboard';
import { formatWhen, parseBirthday, type NextBirthday } from '@/lib/birthday';
import { isAdmin } from '@/lib/permissions';
import { providerLabels } from '@/lib/providers';
import { requireEditor } from '@/lib/session';
import { cn, count } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { Greeting } from '@/components/greeting';
import { LocalTime } from '@/components/local-time';
import { MissingBadges } from '@/components/missing-badges';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';
import { StorageUsage } from '@/components/storage-usage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Dashboard' };

const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

/**
 * Every list row is this tall, whatever it holds, so side-by-side lists line
 * up row for row: a photo, two lines of text, or a name and a badge line.
 */
const row = 'flex min-h-18 items-center gap-3 px-3 py-2';

export default async function DashboardPage() {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);

  const dashboard = await getDashboard({ admin });
  const { stats, users } = dashboard;

  // Tiles with a page of their own link to it.
  const tiles: { label: string; value: number; href?: string }[] = [
    { label: 'Plushies', value: stats.plushies, href: '/dashboard/plushies' },
    { label: 'Photos', value: stats.photos, href: '/dashboard/photos' },
    { label: 'Likes', value: stats.likes },
    { label: 'Comments', value: stats.comments },
    {
      label: `Changes in ${RECENT_DAYS} days`,
      value: stats.recentChanges,
      href: '/dashboard/activity',
    },
  ];

  const links = [
    {
      href: '/dashboard/plushies',
      icon: HeartIcon,
      title: 'Plushies',
      text: 'Browse and edit every plushie',
    },
    {
      href: '/dashboard/plushies/new',
      icon: PlusIcon,
      title: 'New Plushie',
      text: 'Add a new soft friend',
    },
    {
      href: '/dashboard/activity',
      icon: HistoryIcon,
      title: 'Activity',
      text: 'See and undo recent changes',
    },
    ...(users
      ? [
          {
            href: '/dashboard/users',
            icon: UsersIcon,
            title: 'Users',
            text: `${count(users.total, 'account')}, ${count(users.admins, 'admin')} and ${count(users.editors, 'editor')}`,
          },
        ]
      : []),
  ];

  return (
    <div className='flex flex-col gap-8'>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          <Greeting name={session.user.name} />
        </h1>
        <p className='text-pretty text-muted-foreground'>
          Everything for looking after the plushies.
        </p>
      </Reveal>

      {/* Five tiles: on two columns, the last one takes a whole row. */}
      <RevealGroup as='dl' className='grid grid-cols-2 gap-4 lg:grid-cols-5'>
        {tiles.map((tile) => (
          <RevealItem
            key={tile.label}
            className='group relative flex flex-col gap-1 rounded-xl p-4 ring-1 ring-foreground/10 transition-colors last:col-span-2 has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-ring has-[a:hover]:bg-muted/50 lg:last:col-span-1'
          >
            <dt
              className={cn(
                'text-sm text-muted-foreground',
                tile.href && 'pr-5'
              )}
            >
              {tile.label}
            </dt>
            <dd className='text-3xl font-semibold'>
              {tile.href ? (
                // Stretched over the whole tile, so all of it is clickable.
                <Link
                  href={tile.href}
                  aria-label={`${tile.label}: ${compact.format(tile.value)}`}
                  className='outline-none after:absolute after:inset-0 after:rounded-xl'
                >
                  {compact.format(tile.value)}
                </Link>
              ) : (
                compact.format(tile.value)
              )}
            </dd>
            {tile.href && (
              <ChevronRightIcon
                className='absolute top-4 right-4 size-4 text-muted-foreground transition-transform group-has-[a:hover]:translate-x-0.5'
                aria-hidden
              />
            )}
          </RevealItem>
        ))}
      </RevealGroup>

      <RevealGroup as='ul' className='grid gap-4 sm:grid-cols-2'>
        {links.map((link) => (
          <RevealItem as='li' key={link.href}>
            <DashboardLink {...link} />
          </RevealItem>
        ))}
      </RevealGroup>

      {/* Each section spans two rows, header and list, so sections side by
          side share both: their lists start and end at the same height. */}
      <div className='grid gap-8 lg:grid-cols-2'>
        <Section
          title='Recently edited'
          description='Plushies that have been recently edited.'
          action={
            <SeeAll href='/dashboard/plushies?view=recent'>Show all</SeeAll>
          }
        >
          {dashboard.recentlyEdited.length > 0 ? (
            <List>
              {dashboard.recentlyEdited.map((plushie) => (
                <PlushieRow key={plushie.id} plushie={plushie} edit>
                  {plushie.isNew ? 'Added' : 'Edited'}{' '}
                  <LocalTime iso={plushie.updatedAt} />
                </PlushieRow>
              ))}
            </List>
          ) : (
            <EmptyState icon={HeartIcon}>No plushies yet.</EmptyState>
          )}
        </Section>

        <Section
          title='Needs attention'
          description={
            dashboard.needsAttention.total > 0
              ? `${count(dashboard.needsAttention.total, 'plushie')} whose page is still missing something.`
              : 'Plushies whose page is still missing something.'
          }
          action={
            dashboard.needsAttention.total > 0 && (
              <SeeAll href='/dashboard/plushies?view=attention'>
                Show all
              </SeeAll>
            )
          }
        >
          {dashboard.needsAttention.plushies.length > 0 ? (
            <List>
              {dashboard.needsAttention.plushies.map((plushie) => (
                <PlushieRow key={plushie.id} plushie={plushie} edit>
                  <MissingBadges missing={plushie.missing} limit={2} />
                </PlushieRow>
              ))}
            </List>
          ) : (
            <EmptyState icon={SparklesIcon}>
              Every plushie is complete.
            </EmptyState>
          )}
        </Section>

        <Section
          title='Recent comments'
          description={`${count(dashboard.comments.recentCount, 'comment')} in the last ${RECENT_DAYS} days.`}
        >
          {dashboard.comments.latest.length > 0 ? (
            <List>
              {dashboard.comments.latest.map((comment) => (
                <li
                  key={comment.id}
                  className={cn(
                    row,
                    'flex-col items-stretch justify-center gap-1'
                  )}
                >
                  <p className='truncate text-sm text-muted-foreground'>
                    <CommentAuthor author={comment.author} link={admin} /> on{' '}
                    <Link
                      href={`/plushies/${comment.plushie.slug}`}
                      className='font-semibold text-foreground hover:underline'
                    >
                      {comment.plushie.name}
                    </Link>{' '}
                    <LocalTime iso={comment.createdAt} />
                    {comment.editedAt && ' (edited)'}
                  </p>
                  {/* One line here; the whole comment is on the plushie's page. */}
                  <p className='truncate text-sm'>{comment.body}</p>
                </li>
              ))}
            </List>
          ) : (
            <EmptyState icon={MessageCircleIcon}>No comments yet.</EmptyState>
          )}
        </Section>

        <Section
          title='Upcoming birthdays'
          description='Whose birthday comes next.'
          action={
            <SeeAll href='/dashboard/plushies?view=birthdays'>Show all</SeeAll>
          }
        >
          {dashboard.birthdays.length > 0 ? (
            <List>
              {dashboard.birthdays.map((plushie) => (
                <PlushieRow
                  key={plushie.id}
                  plushie={plushie}
                  aside={
                    <span
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 text-sm',
                        plushie.next.days === 0
                          ? 'font-semibold text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {plushie.next.days === 0 && (
                        <CakeIcon className='size-4' aria-hidden />
                      )}
                      {whenLabel(plushie.next)}
                    </span>
                  }
                >
                  Turns {plushie.next.turns} · {birthdayDate(plushie.birthday)}
                </PlushieRow>
              ))}
            </List>
          ) : (
            <EmptyState icon={CakeIcon}>
              No plushie has a birthday yet.
            </EmptyState>
          )}
        </Section>

        {users && (
          <Section
            title='New accounts'
            description={`${count(users.newAccountCount, 'account')} in the last ${RECENT_DAYS} days.`}
            action={<SeeAll href='/dashboard/users'>All users</SeeAll>}
          >
            {users.newAccounts.length > 0 ? (
              <List>
                {users.newAccounts.map((user) => (
                  <li key={user.id} className={cn(row, 'flex-wrap gap-y-1')}>
                    <div className='min-w-0 flex-1'>
                      <Link
                        href={`/dashboard/users/${user.id}`}
                        className='block truncate font-heading font-semibold hover:underline'
                      >
                        {user.name}
                      </Link>
                      <p className='text-sm text-muted-foreground'>
                        Joined <LocalTime iso={user.createdAt} />
                      </p>
                    </div>
                    <div className='flex gap-1'>
                      {user.accounts.map(({ providerId }) => (
                        <Badge key={providerId} variant='secondary'>
                          {providerLabels[providerId] ?? providerId}
                        </Badge>
                      ))}
                    </div>
                  </li>
                ))}
              </List>
            ) : (
              <EmptyState icon={UserPlusIcon}>No one new this week.</EmptyState>
            )}
          </Section>
        )}

        <Section
          title='Photo storage'
          description='Space used on UploadThing.'
          action={<SeeAll href='/dashboard/photos'>All photos</SeeAll>}
        >
          {/* Not a list, so it keeps its own height instead of stretching
              to match the section beside it. */}
          <div className='self-start'>
            <StorageUsage />
          </div>
        </Section>
      </div>
    </div>
  );
}

/** The comment's author, linked to their user page for admins. */
function CommentAuthor({
  author,
  link,
}: {
  author: { id: string; name: string } | null;
  link: boolean;
}) {
  if (!author) return <>A deleted account</>;
  if (!link) {
    return <span className='font-semibold text-foreground'>{author.name}</span>;
  }
  return (
    <Link
      href={`/dashboard/users/${author.id}`}
      className='font-semibold text-foreground hover:underline'
    >
      {author.name}
    </Link>
  );
}

/** e.g. 'Today', 'In 5 days', or 'This month' or 'In October' without a day. */
function whenLabel(next: NextBirthday) {
  const when = formatWhen(next);
  return when.charAt(0).toUpperCase() + when.slice(1);
}

/** e.g. 'October 2', or 'Sometime in October' without a day. */
function birthdayDate(value: string) {
  const birthday = parseBirthday(value);
  if (!birthday?.month) return value;
  const date = new Date(2000, birthday.month - 1, birthday.day ?? 1);
  if (!birthday.day) {
    return `Sometime in ${date.toLocaleDateString('en-US', { month: 'long' })}`;
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Reveal as='section' className='row-span-2 grid grid-rows-subgrid gap-4'>
      <div className='flex items-end justify-between gap-2'>
        <div>
          <h2 className='font-heading text-xl font-semibold'>{title}</h2>
          {description && (
            <p className='text-sm text-pretty text-muted-foreground'>
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </Reveal>
  );
}

function SeeAll({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button variant='ghost' size='sm' className='shrink-0' asChild>
      <Link href={href}>
        {children}
        <ChevronRightIcon />
      </Link>
    </Button>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
      {children}
    </ul>
  );
}

/** A plushie with its photo, a line of details, and an edit link or `aside`. */
function PlushieRow({
  plushie,
  edit,
  aside,
  children,
}: {
  plushie: DashboardPlushie;
  edit?: boolean;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className={row}>
      <PlushiePhoto
        plushie={plushie}
        sizes='40px'
        compact
        className='size-10 shrink-0 rounded-lg'
      />
      <div className='min-w-0 flex-1'>
        <Link
          href={`/plushies/${plushie.slug}`}
          className='font-heading font-semibold hover:underline'
        >
          {plushie.name}
        </Link>
        <div className='text-sm text-muted-foreground'>{children}</div>
      </div>
      {edit && (
        <Button variant='outline' size='sm' asChild>
          <Link href={`/dashboard/plushies/${plushie.id}`}>
            <PencilIcon />
            Edit
          </Link>
        </Button>
      )}
      {aside}
    </li>
  );
}

function DashboardLink({
  href,
  icon: Icon,
  title,
  text,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className='group flex items-center gap-4 rounded-xl p-4 ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring'
    >
      <span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 p-2 text-primary'>
        <Icon className='size-5' aria-hidden />
      </span>
      <span className='flex min-w-0 flex-1 flex-col'>
        <span className='font-heading font-semibold'>{title}</span>
        <span className='text-sm text-pretty text-muted-foreground'>
          {text}
        </span>
      </span>
      <ChevronRightIcon
        className='size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5'
        aria-hidden
      />
    </Link>
  );
}
