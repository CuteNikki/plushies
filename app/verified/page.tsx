import type { Metadata } from 'next';
import Link from 'next/link';

import { MailCheckIcon, MailXIcon, SendIcon } from 'lucide-react';

import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Email Verification' };

const messages = {
  // A new account's address, or a resent link.
  verified: {
    title: 'Email Verified',
    text: 'Thanks! Your email address is confirmed.',
  },
  // Changing email, step 1: confirmed from the old address.
  confirmed: {
    title: 'Almost There',
    text: 'We sent one more link to your new address. Open it to finish changing your email.',
  },
  // Changing email, step 2: confirmed from the new address.
  changed: {
    title: 'Email Changed',
    text: 'Your new email address is confirmed and now in use.',
  },
};

/** Where the links in verification and email change emails land. */
export default async function VerifiedPage(props: PageProps<'/verified'>) {
  const { error, step } = await props.searchParams;
  const message =
    step === 'confirmed' || step === 'changed'
      ? messages[step]
      : messages.verified;
  const Icon = step === 'confirmed' ? SendIcon : MailCheckIcon;

  return (
    <div className='mx-auto flex max-w-sm flex-col gap-6 py-8'>
      {error ? (
        <Reveal className='flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10'>
          <MailXIcon className='size-10 text-destructive' />
          <div className='flex flex-col gap-1'>
            <h1 className='font-heading text-2xl font-semibold'>
              That link didn&rsquo;t work
            </h1>
            <p className='text-sm text-muted-foreground'>
              {error === 'TOKEN_EXPIRED'
                ? 'It has expired. Links work for 24 hours.'
                : 'It is invalid or was already used.'}{' '}
              Sign in and try again from your account settings.
            </p>
          </div>
          <Button asChild>
            <Link href='/account'>Go to account settings</Link>
          </Button>
        </Reveal>
      ) : (
        <Reveal className='flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10'>
          <Icon className='size-10 text-primary' />
          <div className='flex flex-col gap-1'>
            <h1 className='font-heading text-2xl font-semibold'>
              {message.title}
            </h1>
            <p className='text-sm text-muted-foreground'>{message.text}</p>
          </div>
          <Button asChild>
            <Link href={step ? '/account' : '/'}>
              {step ? 'Go to account settings' : 'See the plushies'}
            </Link>
          </Button>
        </Reveal>
      )}
    </div>
  );
}
