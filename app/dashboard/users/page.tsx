import type { Metadata } from 'next';

import { UsersIcon } from 'lucide-react';

import { getUsers, userRoles, userSorts } from '@/data/users';
import { isBanned } from '@/lib/bans';
import { oneOf, plainQuery, searchQuery } from '@/lib/list-params';
import { requireAdmin } from '@/lib/session';

import { BackButton } from '@/components/back-button';
import { EmptyState } from '@/components/empty-state';
import { ItemMenuButton } from '@/components/item-menu';
import { ListControls } from '@/components/list-controls';
import { Reveal } from '@/components/motion';
import { PrivateText } from '@/components/private-text';
import { RoleSelect } from '@/components/role-select';
import { RowLink } from '@/components/row-link';
import { UserActions } from '@/components/user-actions';
import { UserBadges } from '@/components/user-badges';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage(props: PageProps<'/dashboard/users'>) {
  const session = await requireAdmin();
  const searchParams = await props.searchParams;
  const query = plainQuery(searchParams);
  const users = await getUsers({
    q: searchQuery(searchParams.q),
    role: oneOf(searchParams.role, userRoles),
    sort: oneOf(searchParams.sort, userSorts),
  });

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

      <Reveal>
        <ListControls
          query={query}
          search={{
            label: 'Search accounts',
            placeholder: 'Search names or emails',
          }}
          selects={[
            {
              param: 'role',
              label: 'Role',
              options: [
                { value: 'all', label: 'Everyone' },
                { value: 'admin', label: 'Admins' },
                { value: 'editor', label: 'Editors' },
                { value: 'user', label: 'Users' },
                { value: 'banned', label: 'Banned' },
              ],
            },
            {
              param: 'sort',
              label: 'Order',
              options: [
                { value: 'oldest', label: 'Oldest first' },
                { value: 'newest', label: 'Newest first' },
                { value: 'name', label: 'Name A–Z' },
              ],
            },
          ]}
        />
      </Reveal>

      {users.length === 0 && (
        <Reveal>
          <EmptyState icon={UsersIcon}>No accounts match.</EmptyState>
        </Reveal>
      )}

      {users.length > 0 && (
        <>
          {/* The card rises as a whole, then its rows fade in without moving, so
          nothing slides past the card's edge. */}
          <Reveal
            as='ul'
            className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'
          >
            {users.map((user) => {
              const isYou = user.id === session.user.id;
              return (
                <Reveal as='li' direction='none' key={user.id}>
                  <UserActions
                    user={{ id: user.id, name: user.name, role: user.role }}
                    banned={isBanned(user)}
                    twoFactor={!!user.twoFactorEnabled}
                    disabled={isYou}
                    className='grid grid-cols-[1fr_auto] items-center gap-3 p-4 xs:grid-cols-[1fr_auto_auto]'
                  >
                    {/* All of it links to their page, except the email. */}
                    <div className='relative flex min-w-0 flex-col gap-1.5'>
                      <RowLink href={`/dashboard/users/${user.id}`}>
                        {user.name}
                      </RowLink>
                      <PrivateText className='relative w-fit text-sm text-muted-foreground'>
                        {user.email}
                      </PrivateText>
                      <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                        <UserBadges
                          user={user}
                          passkeys={user._count.passkeys}
                          banned={isBanned(user)}
                        />
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
                    <ItemMenuButton className='self-start xs:order-last xs:self-center' />
                    <RoleSelect
                      userId={user.id}
                      role={user.role}
                      disabled={isYou}
                      className='col-span-2 w-full xs:col-span-1 xs:w-24'
                    />
                  </UserActions>
                </Reveal>
              );
            })}
          </Reveal>
        </>
      )}
    </div>
  );
}
