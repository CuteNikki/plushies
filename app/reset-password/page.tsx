import type { Metadata } from 'next';
import Link from 'next/link';

import { LinkIcon } from 'lucide-react';

import { AuthShell } from '@/components/auth-shell';
import { AuthStatus } from '@/components/auth-status';
import { Reveal } from '@/components/motion';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Reset Password' };

export default async function ResetPasswordPage(
  props: PageProps<'/reset-password'>
) {
  const { token, error } = await props.searchParams;
  const valid = typeof token === 'string' && !error;

  return (
    <AuthShell>
      {valid ? (
        <>
          <Reveal className='flex flex-col gap-1 text-center'>
            <h1 className='font-heading text-3xl font-semibold'>
              Choose a new password
            </h1>
            <p className='text-sm text-pretty text-muted-foreground'>
              You&rsquo;ll be signed out everywhere else afterwards.
            </p>
          </Reveal>
          <Reveal>
            <ResetPasswordForm token={token} />
          </Reveal>
        </>
      ) : (
        <Reveal>
          <AuthStatus
            icon={LinkIcon}
            tone='destructive'
            titleAs='h1'
            title='That link didn’t work'
            actions={
              <Button asChild>
                <Link href='/forgot-password'>Send a new link</Link>
              </Button>
            }
          >
            It is invalid, was already used or has expired. Reset links work for
            one hour.
          </AuthStatus>
        </Reveal>
      )}
    </AuthShell>
  );
}
