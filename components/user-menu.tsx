'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  HeartIcon,
  HistoryIcon,
  ImageIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageCircleIcon,
  PlusIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from 'lucide-react';

import { authClient } from '@/lib/auth-client';
import {
  canEditPlushies,
  isAdmin,
  isRole,
  roleLabels,
} from '@/lib/permissions';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/user-avatar';

/** The dashboard's pages, for editors. Users is only for admins. */
const dashboardLinks: {
  href: string;
  icon: LucideIcon;
  label: string;
  adminOnly?: boolean;
}[] = [
  { href: '/dashboard', icon: LayoutDashboardIcon, label: 'Dashboard' },
  { href: '/dashboard/plushies', icon: HeartIcon, label: 'Plushies' },
  { href: '/dashboard/plushies/new', icon: PlusIcon, label: 'New Plushie' },
  { href: '/dashboard/photos', icon: ImageIcon, label: 'Photos' },
  { href: '/dashboard/comments', icon: MessageCircleIcon, label: 'Comments' },
  { href: '/dashboard/activity', icon: HistoryIcon, label: 'Activity' },
  {
    href: '/dashboard/users',
    icon: UsersIcon,
    label: 'Users',
    adminOnly: true,
  },
];

// A client component so the public pages can stay statically rendered.
export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  if (!session) {
    return (
      <Button variant='ghost' size='sm' asChild>
        <Link href='/sign-in'>Sign in</Link>
      </Button>
    );
  }

  const { user } = session;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='icon' className='overflow-hidden'>
          <UserAvatar user={user} />
          <span className='sr-only'>Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-auto max-w-72 min-w-48'>
        <DropdownMenuLabel className='flex items-center gap-2.5 py-2 font-normal'>
          <span className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-primary/20'>
            <UserAvatar user={user} />
          </span>
          <span className='flex min-w-0 flex-col'>
            <span className='truncate font-heading font-semibold text-foreground'>
              {user.name}
            </span>
            <span className='text-xs text-muted-foreground'>
              {isRole(user.role) ? roleLabels[user.role] : roleLabels.USER}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canEditPlushies(user.role) && (
          <>
            <DropdownMenuGroup>
              {dashboardLinks
                .filter((link) => !link.adminOnly || isAdmin(user.role))
                .map(({ href, icon: Icon, label }) => (
                  <DropdownMenuItem key={href} asChild>
                    <Link href={href}>
                      <Icon />
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem asChild>
          <Link href='/account'>
            <SettingsIcon />
            Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant='destructive'
          onClick={async () => {
            await authClient.signOut();
            router.push('/');
            router.refresh();
          }}
        >
          <LogOutIcon />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
