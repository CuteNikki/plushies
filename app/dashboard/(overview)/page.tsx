import {
  ChevronRightIcon,
  HeartIcon,
  HistoryIcon,
  type LucideIcon,
  PlusIcon,
  UsersIcon,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { getDashboardStats } from '@/data/dashboard';
import { isAdmin } from '@/lib/permissions';
import { requireEditor } from '@/lib/session';

import { Reveal, RevealGroup, RevealItem } from '@/components/motion';

export const metadata: Metadata = { title: 'Dashboard' };

function count(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

export default async function DashboardPage() {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);

  const stats = await getDashboardStats({ admin });

  const links = [
    {
      href: '/dashboard/plushies',
      icon: HeartIcon,
      title: 'Plushies',
      text: `${count(stats.plushies, 'plushie')} with ${count(stats.photos, 'photo')}`,
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
      text: `${count(stats.recentChanges, 'change')} in the last 7 days`,
    },
    ...(stats.users
      ? [
          {
            href: '/dashboard/users',
            icon: UsersIcon,
            title: 'Users',
            text: `${count(stats.users.total, 'account')}, ${count(stats.users.admins, 'admin')} and ${count(stats.users.editors, 'editor')}`,
          },
        ]
      : []),
  ];

  return (
    <div className='flex flex-col gap-6'>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Dashboard
        </h1>
        <p className='text-pretty text-muted-foreground'>
          Everything for looking after the plushies.
        </p>
      </Reveal>

      <RevealGroup as='ul' className='grid gap-4 sm:grid-cols-2'>
        {links.map((link) => (
          <RevealItem as='li' key={link.href}>
            <DashboardLink {...link} />
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
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
