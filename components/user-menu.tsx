'use client';

import { LogOut, Pencil, Settings, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { authClient } from '@/lib/auth-client';
import { canEditPlushies, roleLabels } from '@/lib/permissions';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
          <Avatar user={user} />
          <span className='sr-only'>Account</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-auto max-w-72 min-w-48'>
        <DropdownMenuLabel className='flex items-center gap-2.5 py-2 font-normal'>
          <span className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-primary ring-1 ring-primary/20'>
            <Avatar user={user} />
          </span>
          <span className='flex min-w-0 flex-col'>
            <span className='truncate font-heading font-semibold text-foreground'>
              {user.name}
            </span>
            <span className='text-xs text-muted-foreground'>
              {roleLabels[user.role ?? 'user'] ?? 'Viewer'}
            </span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {canEditPlushies(user.role) && (
          <DropdownMenuItem asChild>
            <Link href='/dashboard'>
              <Pencil />
              Plushies
            </Link>
          </DropdownMenuItem>
        )}
        {user.role === 'admin' && (
          <DropdownMenuItem asChild>
            <Link href='/dashboard/users'>
              <Users />
              Users
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href='/account'>
            <Settings />
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
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar({ user }: { user: { name: string; image?: string | null } }) {
  if (user.image) {
    return <img src={user.image} alt='' className='size-full object-cover' />;
  }
  return (
    <span className='font-heading'>{user.name.charAt(0).toUpperCase()}</span>
  );
}
