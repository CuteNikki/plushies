'use client';

import { Loader2, MailCheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

import { AuthStatus } from '@/components/auth-status';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const email = String(formData.get('email'));
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    });
    setPending(false);
    if (error) return setError(error.message ?? 'Something went wrong');
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthStatus
        icon={MailCheckIcon}
        title='Check your inbox'
        actions={
          <>
            <Button asChild>
              <Link href='/sign-in'>Back to Sign In</Link>
            </Button>
            <Button variant='ghost' onClick={() => setSentTo(undefined)}>
              Use a different email
            </Button>
          </>
        }
      >
        If there&rsquo;s an account for{' '}
        <strong className='font-semibold text-foreground'>{sentTo}</strong>, a
        reset link is on its way. It works for one hour, and might land in your
        spam folder.
      </AuthStatus>
    );
  }

  return (
    <div className='flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10'>
      <form action={handleSubmit} className='flex flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            name='email'
            type='email'
            required
            autoComplete='email'
          />
        </div>
        {error && <p className='text-sm text-destructive'>{error}</p>}
        <Button type='submit' disabled={pending}>
          {pending && <Loader2 className='animate-spin' />}
          Send Reset Link
        </Button>
      </form>

      <p className='text-center text-sm text-muted-foreground'>
        <Link
          href='/sign-in'
          className='font-medium text-primary hover:underline'
        >
          Back to Sign In.
        </Link>
      </p>
    </div>
  );
}
