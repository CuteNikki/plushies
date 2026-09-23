import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSession } from '@/lib/session';

import { Reveal } from '@/components/motion';
import { SignInForm } from '@/components/sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function SignInPage(props: PageProps<'/sign-in'>) {
  if (await getSession()) redirect('/dashboard');
  const { reset } = await props.searchParams;

  return (
    <div className='mx-auto flex max-w-sm flex-col gap-6 py-8'>
      <Reveal className='flex flex-col gap-1 text-center'>
        <h1 className='font-heading text-3xl font-semibold'>Welcome!</h1>
        <p className='text-sm text-muted-foreground'>
          Sign in to edit the plushies.
        </p>
      </Reveal>
      {reset && (
        <p className='rounded-xl bg-primary/10 px-4 py-3 text-center text-sm'>
          Your password was changed. Sign in with your new one.
        </p>
      )}
      <Reveal>
        <SignInForm />
      </Reveal>
    </div>
  );
}
