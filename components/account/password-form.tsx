'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Loader2Icon } from 'lucide-react';

import { setPassword } from '@/actions/account';
import { authClient } from '@/lib/auth-client';

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
    toast.success(hasPassword ? 'Password Changed' : 'Password Added');
    router.refresh();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className='flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10'
    >
      {hasPassword && (
        <div className='flex flex-col gap-1'>
          <Label htmlFor='currentPassword'>Current Password</Label>
          <Input
            id='currentPassword'
            name='currentPassword'
            type='password'
            required
            autoComplete='current-password'
          />
        </div>
      )}
      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='newPassword'>New Password</Label>
          <Input
            id='newPassword'
            name='newPassword'
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
      </div>
      {error && <p className='text-sm text-destructive'>{error}</p>}
      <div className='flex flex-col gap-3 xs:flex-row xs:items-center xs:justify-between'>
        {hasPassword && (
          <label className='flex items-center gap-2 text-sm'>
            <input
              type='checkbox'
              name='revokeOthers'
              defaultChecked={false}
              className='size-4 accent-primary'
            />
            Sign out on other devices
          </label>
        )}
        <Button type='submit' disabled={pending} className='w-fit'>
          {pending && <Loader2Icon className='animate-spin' />}
          {hasPassword ? 'Change Password' : 'Add Password'}
        </Button>
      </div>
    </form>
  );
}
