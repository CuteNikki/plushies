'use client';

import { KeyRound, LogOut, MoreHorizontal, Trash2 } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import {
  deleteUser,
  sendUserPasswordReset,
  signOutUser,
} from '@/app/admin/actions';
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
  disabled,
}: {
  user: { id: string; name: string };
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>, success: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(success);
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
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-auto min-w-52'>
        <DropdownMenuItem
          onClick={() =>
            run(
              () => sendUserPasswordReset(user.id),
              `Password reset email sent to ${user.name}`
            )
          }
        >
          <KeyRound />
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
          <LogOut />
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
              `${user.name}'s account was deleted`
            );
          }}
        >
          <Trash2 />
          Delete account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
