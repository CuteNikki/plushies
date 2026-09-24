'use client';

import { useState } from 'react';

import { Loader2Icon, MailCheckIcon, Trash2Icon } from 'lucide-react';

import { authClient } from '@/lib/auth-client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    // Sends the email with the link that actually deletes the account.
    const { error } = await authClient.deleteUser({
      password: hasPassword ? String(formData.get('password')) : undefined,
    });
    setPending(false);
    if (error) return setError(error.message ?? 'Something went wrong');
    setOpen(false);
    setSent(true);
  }

  return (
    <div className='flex flex-col gap-2 rounded-xl p-4 ring-1 ring-destructive/30'>
      <div>
        <p className='font-medium'>Delete Account</p>
        <p className='text-sm text-muted-foreground'>
          This removes your account and signs you out everywhere. We&rsquo;ll
          email you a link to confirm first.
        </p>
      </div>
      {sent ? (
        <p className='flex items-start gap-2 text-sm'>
          <MailCheckIcon className='mt-0.5 size-4 shrink-0 text-primary' />
          Check your inbox: we sent you a link to confirm. It works for one
          hour, in this browser.
        </p>
      ) : open ? (
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
              {pending ? (
                <Loader2Icon className='animate-spin' />
              ) : (
                <Trash2Icon />
              )}
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
          <Trash2Icon />
          Delete account
        </Button>
      )}
    </div>
  );
}
