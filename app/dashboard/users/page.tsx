import type { Metadata } from 'next';

import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

import { Reveal } from '@/components/motion';
import { PrivateText } from '@/components/private-text';
import { RoleSelect } from '@/components/role-select';
import { Badge } from '@/components/ui/badge';
import { UserActions } from '@/components/user-actions';

export const metadata: Metadata = { title: 'Users' };

const providerLabels: Record<string, string> = {
  credential: 'Email',
  discord: 'Discord',
};

export default async function UsersPage() {
  const session = await requireAdmin();
  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { accounts: { select: { providerId: true } } },
  });

  return (
    <div className='flex flex-col gap-6'>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Users
        </h1>
        <p className='text-muted-foreground'>
          Editors can add and change plushies. Admins can also manage users.
        </p>
      </Reveal>

      <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
        {users.map((user, index) => {
          const isYou = user.id === session.user.id;
          return (
            <Reveal
              as='li'
              key={user.id}
              delay={0.15 + Math.min(index, 10) * 0.08}
              className='grid grid-cols-[1fr_auto] items-center gap-3 p-4 xs:grid-cols-[1fr_auto_auto]'
            >
              <div className='flex min-w-0 flex-col gap-1.5'>
                <div className='flex min-w-0 items-center gap-1.5'>
                  <p className='truncate font-heading font-semibold'>
                    {user.name}
                  </p>
                  {isYou && <Badge>You</Badge>}
                </div>
                <PrivateText className='w-fit text-sm text-muted-foreground'>
                  {user.email}
                </PrivateText>
                <div className='flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground'>
                  {user.accounts.map(({ providerId }) => (
                    <Badge key={providerId} variant='secondary'>
                      {providerLabels[providerId] ?? providerId}
                    </Badge>
                  ))}
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
                  user={{ id: user.id, name: user.name }}
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
      </ul>
    </div>
  );
}
