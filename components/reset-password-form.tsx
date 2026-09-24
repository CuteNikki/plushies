'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Loader2Icon } from 'lucide-react';

import { authClient } from '@/lib/auth-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    const newPassword = String(formData.get('password'));
    if (newPassword !== formData.get('confirm')) {
      return setError("The passwords don't match");
    }

    setPending(true);
    setError(undefined);
    const { error } = await authClient.resetPassword({ newPassword, token });
    setPending(false);
    if (error) return setError(error.message ?? 'Something went wrong');
    router.push('/sign-in?reset=1');
  }

  return (
    <form
      action={handleSubmit}
      className='flex flex-col gap-3 rounded-2xl bg-card p-6 ring-1 ring-foreground/10'
    >
      <div className='flex flex-col gap-1'>
        <Label htmlFor='password'>New Password</Label>
        <Input
          id='password'
          name='password'
          type='password'
          required
          minLength={8}
          autoComplete='new-password'
        />
      </div>
      <div className='flex flex-col gap-1'>
        <Label htmlFor='confirm'>Repeat Password</Label>
        <Input
          id='confirm'
          name='confirm'
          type='password'
          required
          minLength={8}
          autoComplete='new-password'
        />
      </div>
      {error && <p className='text-sm text-destructive'>{error}</p>}
      <Button type='submit' disabled={pending}>
        {pending && <Loader2Icon className='animate-spin' />}
        Change Password
      </Button>
    </form>
  );
}
