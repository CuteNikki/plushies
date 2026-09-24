import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { safeNext } from '@/lib/redirect';
import { getSession } from '@/lib/session';

import { AuthShell } from '@/components/auth-shell';
import { Reveal } from '@/components/motion';
import { TwoFactorForm } from '@/components/two-factor-form';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = { title: 'Two-Step Sign-In' };

/**
 * The second step of signing in with a password, for accounts with
 * two-step sign-in on. The sign-in form sends people here.
 */
export default async function TwoFactorPage(props: PageProps<'/two-factor'>) {
  const { next: nextParam, methods } = await props.searchParams;
  const next = safeNext(nextParam);
  if (await getSession()) redirect(next);
  const hasApp =
    typeof methods === 'string' && methods.split(',').includes('totp');

  return (
    <>
      <AuthShell>
        <Reveal className='flex flex-col gap-1 text-center'>
          <h1 className='font-heading text-3xl font-semibold'>One more step</h1>
          <p className='text-sm text-pretty text-muted-foreground'>
            {hasApp
              ? 'Enter the code from your authenticator app.'
              : 'We emailed you a code to finish signing in.'}
          </p>
        </Reveal>
        <Reveal>
          <TwoFactorForm hasApp={hasApp} next={next} />
        </Reveal>
      </AuthShell>
      <Toaster />
    </>
  );
}
