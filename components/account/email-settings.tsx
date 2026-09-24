'use client';

import { BadgeCheckIcon, Loader2Icon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { authClient } from '@/lib/auth-client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** Current address with its verification state, and a form to change it. */
export function EmailSettings({
  email,
  verified,
}: {
  email: string;
  verified: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [resending, setResending] = useState(false);
  const [changing, setChanging] = useState(false);

  async function resend() {
    setResending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/verified',
    });
    setResending(false);
    if (error) {
      toast.error(error.message ?? 'Something went wrong');
      return;
    }
    toast.success('Verification email sent. Check your inbox.');
  }

  async function changeEmail(formData: FormData) {
    const newEmail = String(formData.get('newEmail')).trim();
    setChanging(true);
    const { error } = await authClient.changeEmail({
      newEmail,
      callbackURL: '/verified',
    });
    setChanging(false);
    if (error) {
      toast.error(error.message ?? 'Something went wrong');
      return;
    }
    formRef.current?.reset();
    // For privacy, the response is the same whether or not the new address
    // is already taken, so the messages can't promise more than this.
    toast.success(
      verified
        ? `If ${newEmail} is available, we sent a confirmation link to ${email}. Open it to continue.`
        : `If ${newEmail} is available, it is now your email. Check it for a verification link.`,
      { duration: 8000 }
    );
    router.refresh();
  }

  return (
    <div className='flex flex-col gap-4 rounded-xl p-4 ring-1 ring-foreground/10'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2'>
        <span className='font-medium break-all'>{email}</span>
        {verified ? (
          <Badge>
            <BadgeCheckIcon />
            Verified
          </Badge>
        ) : (
          <Badge variant='outline'>Unverified</Badge>
        )}
        {!verified && (
          <Button
            size='sm'
            variant='default'
            disabled={resending}
            onClick={resend}
            className='ml-auto'
          >
            {resending && <Loader2Icon className='animate-spin' />}
            Send Verification
          </Button>
        )}
      </div>

      <form
        ref={formRef}
        action={changeEmail}
        className='flex flex-col gap-1 border-t pt-4'
      >
        <Label htmlFor='newEmail'>Change Email</Label>
        <div className='flex gap-2'>
          <Input
            id='newEmail'
            name='newEmail'
            type='email'
            required
            autoComplete='email'
            placeholder='new@example.com'
          />
          <Button type='submit' disabled={changing}>
            {changing && <Loader2Icon className='animate-spin' />}
            Change
          </Button>
        </div>
        <p className='text-xs text-muted-foreground'>
          {verified
            ? 'For your safety, we first send a confirmation link to your current address, then one to the new address.'
            : 'Your email changes right away, and we send a verification link to the new address.'}
        </p>
      </form>
    </div>
  );
}
