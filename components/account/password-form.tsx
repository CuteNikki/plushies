'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth-client';

import { setPassword } from '@/app/account/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    const newPassword = String(formData.get('newPassword'));
    if (newPassword !== formData.get('confirm')) {
      return setError("The new passwords don't match");
    }

    setPending(true);
    setError(undefined);
    const result = hasPassword
      ? (
          await authClient.changePassword({
            currentPassword: String(formData.get('currentPassword')),
            newPassword,
            revokeOtherSessions: formData.get('revokeOthers') === 'on',
          })
        ).error
      : (await setPassword(newPassword)).error;
    setPending(false);

    if (result) {
      return setError(
        typeof result === 'string'
          ? result
          : (result.message ?? 'Something went wrong')
      );
    }
    formRef.current?.reset();
    toast.success(hasPassword ? 'Password changed' : 'Password added');
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className='flex flex-col gap-4 rounded-xl p-4 ring-1 ring-foreground/10'
    >
      {hasPassword && (
        <div className='flex flex-col gap-2'>
          <Label htmlFor='currentPassword'>Current password</Label>
          <Input
            id='currentPassword'
            name='currentPassword'
            type='password'
            required
            autoComplete='current-password'
          />
        </div>
      )}
      <div className='grid gap-4 sm:grid-cols-2'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='newPassword'>New password</Label>
          <Input
            id='newPassword'
            name='newPassword'
            type='password'
            required
            minLength={8}
            autoComplete='new-password'
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='confirm'>Repeat new password</Label>
          <Input
            id='confirm'
            name='confirm'
            type='password'
            required
            minLength={8}
            autoComplete='new-password'
          />
        </div>
      </div>
      {hasPassword && (
        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            name='revokeOthers'
            defaultChecked
            className='size-4 accent-primary'
          />
          Sign out on other devices
        </label>
      )}
      {error && <p className='text-sm text-destructive'>{error}</p>}
      <Button type='submit' disabled={pending} className='w-fit'>
        {pending && <Loader2 className='animate-spin' />}
        {hasPassword ? 'Change password' : 'Add password'}
      </Button>
    </form>
  );
}
