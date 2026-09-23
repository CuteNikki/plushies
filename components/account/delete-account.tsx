'use client';

import { Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const { error } = await authClient.deleteUser({
      password: hasPassword ? String(formData.get('password')) : undefined,
    });
    if (error) {
      setPending(false);
      return setError(
        error.code === 'SESSION_EXPIRED'
          ? 'For safety, sign out and back in, then try again.'
          : (error.message ?? 'Something went wrong')
      );
    }
    // A full reload so every part of the page forgets the old session.
    window.location.href = '/';
  }

  return (
    <div className='flex flex-col gap-2 rounded-xl p-4 ring-1 ring-destructive/30'>
      <div>
        <p className='font-medium'>Delete Account</p>
        <p className='text-sm text-muted-foreground'>
          This removes your account and signs you out everywhere.
        </p>
      </div>
      {open ? (
        <form action={handleSubmit} className='flex flex-col gap-3'>
          {hasPassword ? (
            <div className='flex flex-col gap-1'>
              <Label htmlFor='delete-password'>
                Enter your password to confirm
              </Label>
              <Input
                id='delete-password'
                name='password'
                type='password'
                required
                autoComplete='current-password'
              />
            </div>
          ) : (
            <p className='text-sm'>Are you sure? This can&rsquo;t be undone.</p>
          )}
          {error && <p className='text-sm text-destructive'>{error}</p>}
          <div className='flex gap-2'>
            <Button type='submit' variant='destructive' disabled={pending}>
              {pending ? <Loader2 className='animate-spin' /> : <Trash2 />}
              Delete Account
            </Button>
            <Button
              type='button'
              variant='ghost'
              onClick={() => {
                setOpen(false);
                setError(undefined);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant='destructive'
          className='w-fit'
          onClick={() => setOpen(true)}
        >
          <Trash2 />
          Delete account
        </Button>
      )}
    </div>
  );
}
