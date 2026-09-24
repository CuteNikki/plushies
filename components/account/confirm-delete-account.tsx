'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Loader2Icon, Trash2Icon } from 'lucide-react';

import { authClient } from '@/lib/auth-client';

import { AuthStatus } from '@/components/auth-status';
import { Button } from '@/components/ui/button';

/** The last step of deleting an account, after the link from the email. */
export function ConfirmDeleteAccount({
  token,
  name,
}: {
  token: string;
  name: string;
}) {
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    setError(undefined);
    const { error } = await authClient.deleteUser({ token });
    if (error) {
      setPending(false);
      return setError(
        error.code === 'INVALID_TOKEN'
          ? 'This link has expired or was for another account. Ask for a new one in your account settings.'
          : (error.message ?? 'Something went wrong')
      );
    }
    // A full reload so every part of the page forgets the old session.
    window.location.href = '/';
  }

  return (
    <AuthStatus
      icon={Trash2Icon}
      tone='destructive'
      titleAs='h1'
      title='Delete your account?'
      actions={
        <>
          <Button variant='destructive' disabled={pending} onClick={confirm}>
            {pending && <Loader2Icon className='animate-spin' />}
            Delete my account
          </Button>
          <Button variant='ghost' asChild>
            <Link href='/account'>Keep my account</Link>
          </Button>
        </>
      }
    >
      This deletes the account of {name} and signs you out everywhere. It
      can&rsquo;t be undone.
      {error && <span className='mt-2 block text-destructive'>{error}</span>}
    </AuthStatus>
  );
}
