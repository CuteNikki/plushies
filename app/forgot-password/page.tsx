import type { Metadata } from 'next';

import { ForgotPasswordForm } from '@/components/forgot-password-form';
import { Reveal } from '@/components/motion';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <div className='mx-auto flex max-w-sm flex-col gap-6 py-8'>
      <Reveal className='flex flex-col gap-1 text-center'>
        <h1 className='font-heading text-3xl font-semibold'>
          Forgot your password?
        </h1>
        <p className='text-sm text-muted-foreground'>
          We&rsquo;ll email you a link to choose a new one.
        </p>
      </Reveal>
      <Reveal delay={0.2}>
        <ForgotPasswordForm />
      </Reveal>
    </div>
  );
}
