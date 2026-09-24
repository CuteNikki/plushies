'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import {
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
  /** Banned accounts can't be viewed as: they can't have a session. */
  banned?: boolean;
  disabled?: boolean;
  /** Where to go once the account is deleted, e.g. away from its page. */
  afterDelete?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
    <DropdownMenu>
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
        <DropdownMenuItem
          variant='destructive'
          onClick={() => {
            if (
              !confirm(
                `Delete ${user.name}'s account? They can sign up again, but will start as a viewer.`
              )
            ) {
              return;
            }
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
  );
}
