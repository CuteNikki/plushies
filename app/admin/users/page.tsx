import type { Metadata } from 'next';

import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

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
      <div>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Users
        </h1>
        <p className='text-muted-foreground'>
          Editors can add and change plushies. Admins can also manage users.
        </p>
      </div>

      <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
        {users.map((user) => {
          const isYou = user.id === session.user.id;
          return (
            <li key={user.id} className='flex items-center gap-3 p-3 px-4'>
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <div className='flex flex-wrap items-center gap-1.5'>
                  <p className='truncate font-heading font-semibold'>
                    {user.name}
                  </p>
                  {isYou && <Badge>You</Badge>}
                  {user.accounts.map(({ providerId }) => (
                    <Badge key={providerId} variant='secondary'>
                      {providerLabels[providerId] ?? providerId}
                    </Badge>
                  ))}
                </div>
                <p className='truncate text-sm text-muted-foreground'>
                  <PrivateText>{user.email}</PrivateText>
                  {' · joined '}
                  {user.createdAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <RoleSelect userId={user.id} role={user.role} disabled={isYou} />
              <UserActions
                user={{ id: user.id, name: user.name }}
                disabled={isYou}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
