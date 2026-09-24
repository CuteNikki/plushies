import type { Metadata } from 'next';
import Link from 'next/link';

import { getUsers } from '@/data/users';
import { isBanned } from '@/lib/bans';
import { requireAdmin } from '@/lib/session';

import { BackButton } from '@/components/back-button';
import { Reveal } from '@/components/motion';
import { PrivateText } from '@/components/private-text';
import { RoleSelect } from '@/components/role-select';
import { UserActions } from '@/components/user-actions';
import { UserBadges } from '@/components/user-badges';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const session = await requireAdmin();
  const users = await getUsers();

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex'>
        <BackButton href='/dashboard'>Dashboard</BackButton>
      </Reveal>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Users
        </h1>
        <p className='text-pretty text-muted-foreground'>
          Editors can add and change plushies. Admins can also manage users.
        </p>
      </Reveal>

      {/* The card rises as a whole, then its rows fade in without moving, so
          nothing slides past the card's edge. */}
      <Reveal
        as='ul'
        className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'
      >
        {users.map((user) => {
          const isYou = user.id === session.user.id;
          return (
            <Reveal
              as='li'
              direction='none'
              key={user.id}
              className='grid grid-cols-[1fr_auto] items-center gap-3 p-4 xs:grid-cols-[1fr_auto_auto]'
            >
              <div className='flex min-w-0 flex-col gap-1.5'>
                <div className='flex min-w-0 items-center gap-1.5'>
                  <Link
                    href={`/dashboard/users/${user.id}`}
                    className='truncate font-heading font-semibold hover:underline'
                  >
                    {user.name}
                  </Link>
                </div>
                <PrivateText className='w-fit text-sm text-muted-foreground'>
                  {user.email}
                </PrivateText>
                <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                  <UserBadges user={user} banned={isBanned(user)} />
                  <span>
                    Joined{' '}
                    {user.createdAt.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
              <div className='self-start xs:order-last xs:self-center'>
                <UserActions
                  user={{ id: user.id, name: user.name, role: user.role }}
                  banned={isBanned(user)}
                  disabled={isYou}
                />
              </div>
              <RoleSelect
                userId={user.id}
                role={user.role}
                disabled={isYou}
                className='col-span-2 w-full xs:col-span-1 xs:w-24'
              />
            </Reveal>
          );
        })}
      </Reveal>
    </div>
  );
}
