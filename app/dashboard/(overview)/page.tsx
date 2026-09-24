import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import {
  CakeIcon,
  ChevronRightIcon,
  HeartIcon,
  HistoryIcon,
  PencilIcon,
  PlusIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import {
  BIRTHDAY_DAYS,
  getDashboard,
  RECENT_DAYS,
  type DashboardPlushie,
  type Missing,
} from '@/data/dashboard';
import { parseBirthday } from '@/lib/birthday';
import { isAdmin } from '@/lib/permissions';
import { providerLabels } from '@/lib/providers';
import { requireEditor } from '@/lib/session';
import { getStorageUsage } from '@/lib/uploads';
import { cn, count, formatBytes } from '@/lib/utils';

import { Greeting } from '@/components/greeting';
import { LocalTime } from '@/components/local-time';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = { title: 'Dashboard' };

const missingLabels: Record<Missing, string> = {
  thumbnail: 'No thumbnail',
  photos: 'No gallery photos',
  birthday: 'No birthday',
  species: 'No species',
};

const compact = new Intl.NumberFormat('en-US', { notation: 'compact' });

export default async function DashboardPage() {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);

  const dashboard = await getDashboard({ admin });
  const { stats, users } = dashboard;

  const tiles = [
    { label: 'Plushies', value: stats.plushies },
    { label: 'Photos', value: stats.photos },
    { label: 'Likes', value: stats.likes },
    { label: `Changes in ${RECENT_DAYS} days`, value: stats.recentChanges },
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

      <RevealGroup as='dl' className='grid grid-cols-2 gap-4 lg:grid-cols-4'>
        {tiles.map((tile) => (
          <RevealItem
            key={tile.label}
            className='flex flex-col gap-1 rounded-xl p-4 ring-1 ring-foreground/10'
          >
            <dt className='text-sm text-muted-foreground'>{tile.label}</dt>
            <dd className='text-3xl font-semibold'>
              {compact.format(tile.value)}
            </dd>
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

      <div className='grid items-start gap-8 lg:grid-cols-2'>
        <Section
          title='Recently edited'
          description='Plushies that have been recently edited.'
          action={<SeeAll href='/dashboard/plushies'>All plushies</SeeAll>}
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
            <Empty>No plushies yet.</Empty>
          )}
        </Section>

        <Section
          title='Needs attention'
          description='Plushies whose page is still missing something.'
          action={
            dashboard.needsAttention.total >
              dashboard.needsAttention.plushies.length && (
              <SeeAll href='/dashboard/plushies'>
                {dashboard.needsAttention.total -
                  dashboard.needsAttention.plushies.length}{' '}
                more
              </SeeAll>
            )
          }
        >
          {dashboard.needsAttention.plushies.length > 0 ? (
            <List>
              {dashboard.needsAttention.plushies.map((plushie) => (
                <PlushieRow key={plushie.id} plushie={plushie} edit>
                  <span className='mt-1 flex flex-wrap gap-1'>
                    {plushie.missing.map((missing) => (
                      <Badge key={missing} variant='outline'>
                        {missingLabels[missing]}
                      </Badge>
                    ))}
                  </span>
                </PlushieRow>
              ))}
            </List>
          ) : (
            <Empty>Every plushie is complete.</Empty>
          )}
        </Section>

        <Section
          title='Upcoming birthdays'
          description={`In the next ${BIRTHDAY_DAYS} days.`}
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
                        plushie.days === 0
                          ? 'font-semibold text-primary'
                          : 'text-muted-foreground'
                      )}
                    >
                      {plushie.days === 0 && (
                        <CakeIcon className='size-4' aria-hidden />
                      )}
                      {whenLabel(plushie.days)}
                    </span>
                  }
                >
                  Turns {plushie.turns} · {birthdayDate(plushie.birthday)}
                </PlushieRow>
              ))}
            </List>
          ) : (
            <Empty>No birthdays coming up.</Empty>
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
                  <li
                    key={user.id}
                    className='flex flex-wrap items-center gap-x-3 gap-y-1 p-3'
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='truncate font-heading font-semibold'>
                        {user.name}
                      </p>
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
              <Empty>No one new this week.</Empty>
            )}
          </Section>
        )}

        <Section title='Photo storage' description='Space used on UploadThing.'>
          <Suspense fallback={<StorageSkeleton />}>
            <StorageUsage />
          </Suspense>
        </Section>
      </div>
    </div>
  );
}

/** e.g. 'Today', 'Tomorrow', 'In 5 days', or 'This month' without a day. */
function whenLabel(days: number | null) {
  if (days === null) return 'This month';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
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

/**
 * Looked up from UploadThing on each visit. It streams in after the rest of
 * the page, so a slow answer doesn't hold up the dashboard.
 */
async function StorageUsage() {
  const usage = await getStorageUsage().catch((error) => {
    console.error('Failed to load UploadThing usage', error);
    return null;
  });
  if (!usage)
    return <Empty>Couldn&rsquo;t load storage usage right now.</Empty>;

  const share =
    usage.limitBytes > 0 ? Math.min(usage.usedBytes / usage.limitBytes, 1) : 0;
  const percent = Math.round(share * 100);
  const almostFull = share >= 0.9;

  return (
    <div className='flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10'>
      <div className='flex flex-wrap items-baseline justify-between gap-x-2'>
        <p className='font-semibold'>
          {formatBytes(usage.usedBytes)}{' '}
          <span className='font-normal text-muted-foreground'>
            of {formatBytes(usage.limitBytes)}
          </span>
        </p>
        <p
          className={cn(
            'text-sm',
            almostFull
              ? 'font-semibold text-destructive'
              : 'text-muted-foreground'
          )}
        >
          {almostFull ? `Almost full, ${percent}%` : `${percent}% used`}
        </p>
      </div>
      <div
        role='meter'
        aria-label='Photo storage used'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={cn(
          'h-2.5 overflow-hidden rounded-full',
          almostFull ? 'bg-destructive/15' : 'bg-primary/15'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full',
            almostFull ? 'bg-destructive' : 'bg-primary'
          )}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className='text-sm text-muted-foreground'>
        {count(usage.files, 'file')} uploaded
      </p>
    </div>
  );
}

function StorageSkeleton() {
  return (
    <div className='flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10'>
      <Skeleton className='h-6 w-40' />
      <Skeleton className='h-2.5 w-full rounded-full' />
      <Skeleton className='h-5 w-28' />
    </div>
  );
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

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className='rounded-xl p-4 text-sm text-muted-foreground ring-1 ring-foreground/10'>
      {children}
    </p>
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
    <li className='flex items-center gap-3 p-3'>
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
