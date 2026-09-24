import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { safeNext } from '@/lib/redirect';
import { getSession } from '@/lib/session';

import { AuthShell } from '@/components/auth-shell';
import { Reveal } from '@/components/motion';
import { SignInForm } from '@/components/sign-in-form';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = { title: 'Sign In' };

export default async function SignInPage(props: PageProps<'/sign-in'>) {
  const { reset, next: nextParam } = await props.searchParams;
  // Where to go afterwards, e.g. back to a plushie someone wanted to like.
  const next = safeNext(nextParam);
  if (await getSession()) redirect(next);

  return (
    <>
      <AuthShell>
        <Reveal className='flex flex-col gap-1 text-center'>
          <h1 className='font-heading text-3xl font-semibold'>Welcome!</h1>
          <p className='text-sm text-pretty text-muted-foreground'>
            Sign in to edit the plushies.
          </p>
        </Reveal>
        {reset && (
          <p className='rounded-xl bg-primary/10 px-4 py-3 text-center text-sm'>
            Your password was changed. Sign in with your new one.
          </p>
        )}
        <Reveal>
          <SignInForm next={next} />
        </Reveal>
      </AuthShell>
      <Toaster />
    </>
  );
}
