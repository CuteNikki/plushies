'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  BanIcon,
  EyeIcon,
  KeyRoundIcon,
  LogOutIcon,
  MoreHorizontalIcon,
  Trash2Icon,
} from 'lucide-react';

import {
  deleteUser,
  sendUserPasswordReset,
  signOutUser,
  viewAsUser,
} from '@/actions/users';
import { isAdmin } from '@/lib/permissions';

import { BanDialog, confirmLiftBan, liftBan } from '@/components/ban-controls';
import { useConfirm } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserActions({
  user,
  banned,
  disabled,
  afterDelete,
}: {
  user: { id: string; name: string; role: string };
  /** Offers lifting the ban instead of banning, and hides viewing as them. */
  banned?: boolean;
  disabled?: boolean;
  /** Where to go once the account is deleted, e.g. away from its page. */
  afterDelete?: string;
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
      {/* Not modal, so the dialogs it opens get the focus as it closes. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            size='icon'
            disabled={disabled || pending}
            aria-label={`Actions for ${user.name}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-auto min-w-52'>
          {/* Admins can't be viewed as: they could do anything. */}
          {!isAdmin(user.role) && !banned && (
            <>
              <DropdownMenuItem
                onClick={() =>
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
                <EyeIcon />
                View as {user.name}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() =>
              run(
                () => sendUserPasswordReset(user.id),
                `Password reset email sent to ${user.name}`
              )
            }
          >
            <KeyRoundIcon />
            Send password reset
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() =>
              run(
                () => signOutUser(user.id),
                `${user.name} is signed out everywhere`
              )
            }
          >
            <LogOutIcon />
            Sign out everywhere
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Admins can't be banned; make them an editor first. */}
          {!isAdmin(user.role) &&
            (banned ? (
              <DropdownMenuItem
                variant='destructive'
                onClick={async () => {
                  if (!(await confirmLiftBan(user, ask))) return;
                  startTransition(async () => {
                    if (await liftBan(user)) router.refresh();
                  });
                }}
              >
                <BanIcon />
                Lift ban
              </DropdownMenuItem>
            ) : (
              // The dialog lives outside the menu, which unmounts on close.
              <DropdownMenuItem
                variant='destructive'
                onSelect={() => setBanOpen(true)}
              >
                <BanIcon />
                Ban account
              </DropdownMenuItem>
            ))}
          <DropdownMenuItem
            variant='destructive'
            onClick={async () => {
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
            <Trash2Icon />
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BanDialog user={user} open={banOpen} onOpenChangeAction={setBanOpen} />
      {confirmDialog}
    </>
  );
}
