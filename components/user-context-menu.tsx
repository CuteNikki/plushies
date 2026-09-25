'use client';

import { useState } from 'react';

import { HourglassIcon, UserIcon } from 'lucide-react';

import { getUserMenuInfo } from '@/actions/users';
import { authClient } from '@/lib/auth-client';
import { isAdmin, isViewingAs } from '@/lib/permissions';

import { ItemMenu, ItemMenuItem } from '@/components/item-menu';
import { useUserActionItems } from '@/components/user-actions';

type Info = Awaited<ReturnType<typeof getUserMenuInfo>>;

/**
 * Someone's name or picture, anywhere, with their account's actions on
 * right-click (and a long press) for admins, like on the users page. Just
 * the name for everyone else. Only needs who they are: whether they're
 * banned and the like is looked up as the menu opens.
 */
export function UserContextMenu({
  user,
  as = 'span',
  className,
  children,
}: {
  user: { id: string; name: string };
  /** div for a block, e.g. a row or a picture with a name. */
  as?: 'div' | 'span';
  className?: string;
  children: React.ReactNode;
}) {
  const { data } = authClient.useSession();
  if (!isAdmin(data?.user.role) || isViewingAs(data ?? null)) {
    return <>{children}</>;
  }
  return (
    <AdminMenu user={user} as={as} className={className}>
      {children}
    </AdminMenu>
  );
}

function AdminMenu({
  user,
  as,
  className,
  children,
}: {
  user: { id: string; name: string };
  as: 'div' | 'span';
  className?: string;
  children: React.ReactNode;
}) {
  // Undefined until the first time it opens; null if the account is gone.
  const [info, setInfo] = useState<Info | undefined>(undefined);
  const { items, dialogs, pending } = useUserActionItems({
    user: { ...user, role: info?.role ?? 'USER' },
    banned: info?.banned,
    twoFactor: info?.twoFactor,
    viewAccount: true,
  });
  const viewAccount = (
    <ItemMenuItem icon={UserIcon} href={`/dashboard/users/${user.id}`}>
      View account
    </ItemMenuItem>
  );

  return (
    <>
      <ItemMenu
        as={as}
        tint={false}
        label={`Actions for ${user.name}`}
        disabled={pending}
        className={className}
        // Looked up every time, as a ban or the like may have changed since.
        onOpenChange={(open) => {
          if (!open) return;
          getUserMenuInfo(user.id)
            .then(setInfo)
            .catch(() => setInfo(null));
        }}
        items={
          info === undefined ? (
            <>
              {viewAccount}
              <ItemMenuItem icon={HourglassIcon} disabled>
                Loading…
              </ItemMenuItem>
            </>
          ) : info === null || info.self ? (
            // Gone, or their own: nothing to do to it from here.
            viewAccount
          ) : (
            items
          )
        }
      >
        {children}
      </ItemMenu>
      {dialogs}
    </>
  );
}
