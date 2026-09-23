import type { Metadata } from 'next';
import Link from 'next/link';

import { MailCheckIcon, MailXIcon, SendIcon } from 'lucide-react';

import { AuthShell } from '@/components/auth-shell';
import { AuthStatus } from '@/components/auth-status';
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

  return (
    <AuthShell>
      <Reveal>
        {error ? (
          <AuthStatus
            icon={MailXIcon}
            tone='destructive'
            titleAs='h1'
            title='That link didn’t work'
            actions={
              <Button asChild>
                <Link href='/account'>Go to account settings</Link>
              </Button>
            }
          >
            {error === 'TOKEN_EXPIRED'
              ? 'It has expired. Links work for 24 hours.'
              : 'It is invalid or was already used.'}{' '}
            Sign in and try again from your account settings.
          </AuthStatus>
        ) : (
          <AuthStatus
            icon={step === 'confirmed' ? SendIcon : MailCheckIcon}
            titleAs='h1'
            title={message.title}
            actions={
              <Button asChild>
                <Link href={step ? '/account' : '/'}>
                  {step ? 'Go to account settings' : 'See the plushies'}
                </Link>
              </Button>
            }
          >
            {message.text}
          </AuthStatus>
        )}
      </Reveal>
    </AuthShell>
  );
}
