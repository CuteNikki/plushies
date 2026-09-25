'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  BanIcon,
  EyeIcon,
  KeyRoundIcon,
  LogOutIcon,
  ShieldOffIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react';

import {
  deleteUser,
  resetTwoFactor,
  sendUserPasswordReset,
  signOutUser,
  viewAsUser,
} from '@/actions/users';
import { isAdmin } from '@/lib/permissions';

import { BanDialog, confirmLiftBan, liftBan } from '@/components/ban-controls';
import { useConfirm } from '@/components/confirm-dialog';
import {
  ItemMenu,
  ItemMenuItem,
  ItemMenuSeparator,
} from '@/components/item-menu';

export function UserActions({
  user,
  banned,
  twoFactor,
  disabled,
  afterDelete,
  className,
  children,
}: {
  user: { id: string; name: string; role: string };
  /** Offers lifting the ban instead of banning, and hides viewing as them. */
  banned?: boolean;
  /** Offers turning off their two-step sign-in, if they're locked out. */
  twoFactor?: boolean;
  disabled?: boolean;
  /** Where to go once the account is deleted, e.g. away from its page. */
  afterDelete?: string;
  /** A row to wrap, which also opens the menu on right-click; see ItemMenu. */
  children?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [banOpen, setBanOpen] = useState(false);
  const [ask, confirmDialog] = useConfirm();

  function run(
    action: () => Promise<void>,
    success: string,
    then?: () => void
  ) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
        then?.();
      } catch {
        toast.error('Something went wrong, try again');
      }
    });
  }

  return (
    <>
      <ItemMenu
        label={`Actions for ${user.name}`}
        disabled={disabled || pending}
        className={className}
        items={
          <>
            {/* In a row; their page doesn't need a link to itself. */}
            {children && (
              <>
                <ItemMenuItem
                  icon={UserIcon}
                  href={`/dashboard/users/${user.id}`}
                >
                  View account
                </ItemMenuItem>
                <ItemMenuSeparator />
              </>
            )}
            {/* Admins can't be viewed as: they could do anything. */}
            {!isAdmin(user.role) && !banned && (
              <>
                <ItemMenuItem
                  icon={EyeIcon}
                  onSelect={() =>
                    startTransition(async () => {
                      try {
                        await viewAsUser(user.id);
                        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A full reload, so every part of the page uses their session.
                        window.location.href = '/';
                      } catch {
                        toast.error('Something went wrong, try again');
                      }
                    })
                  }
                >
                  View as {user.name}
                </ItemMenuItem>
                <ItemMenuSeparator />
              </>
            )}
            <ItemMenuItem
              icon={KeyRoundIcon}
              onSelect={() =>
                run(
                  () => sendUserPasswordReset(user.id),
                  `Password reset email sent to ${user.name}`
                )
              }
            >
              Send password reset
            </ItemMenuItem>
            <ItemMenuItem
              icon={LogOutIcon}
              onSelect={() =>
                run(
                  () => signOutUser(user.id),
                  `${user.name} is signed out everywhere`
                )
              }
            >
              Sign out everywhere
            </ItemMenuItem>
            {twoFactor && (
              <ItemMenuItem
                icon={ShieldOffIcon}
                onSelect={async () => {
                  const confirmed = await ask({
                    title: `Reset ${user.name}’s two-step sign-in?`,
                    description:
                      'For when they lost their phone and backup codes. They sign in with just their password until they set it up again.',
                    action: 'Reset',
                    destructive: true,
                  });
                  if (!confirmed) return;
                  run(
                    () => resetTwoFactor(user.id),
                    `${user.name}’s two-step sign-in is off`
                  );
                }}
              >
                Reset two-step sign-in
              </ItemMenuItem>
            )}
            <ItemMenuSeparator />
            {/* Admins can't be banned; make them an editor first. */}
            {!isAdmin(user.role) &&
              (banned ? (
                <ItemMenuItem
                  icon={BanIcon}
                  variant='destructive'
                  onSelect={async () => {
                    if (!(await confirmLiftBan(user, ask))) return;
                    startTransition(async () => {
                      if (await liftBan(user)) router.refresh();
                    });
                  }}
                >
                  Lift ban
                </ItemMenuItem>
              ) : (
                // The dialog lives outside the menu, which unmounts on close.
                <ItemMenuItem
                  icon={BanIcon}
                  variant='destructive'
                  onSelect={() => setBanOpen(true)}
                >
                  Ban account
                </ItemMenuItem>
              ))}
            <ItemMenuItem
              icon={Trash2Icon}
              variant='destructive'
              onSelect={async () => {
                const confirmed = await ask({
                  title: `Delete ${user.name}’s account?`,
                  description:
                    'They can sign up again, but will start as a viewer.',
                  action: 'Delete account',
                  destructive: true,
                });
                if (!confirmed) return;
                run(
                  () => deleteUser(user.id),
                  `${user.name}'s account was deleted`,
                  afterDelete ? () => router.push(afterDelete) : undefined
                );
              }}
            >
              Delete account
            </ItemMenuItem>
          </>
        }
      >
        {children}
      </ItemMenu>
      <BanDialog user={user} open={banOpen} onOpenChangeAction={setBanOpen} />
      {confirmDialog}
    </>
  );
}
