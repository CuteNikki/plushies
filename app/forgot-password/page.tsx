import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth-shell';
import { ForgotPasswordForm } from '@/components/forgot-password-form';
import { Reveal } from '@/components/motion';

export const metadata: Metadata = { title: 'Forgot Password' };

export default function ForgotPasswordPage() {
  return (
    <AuthShell>
      <Reveal className='flex flex-col gap-1 text-center'>
        <h1 className='font-heading text-3xl font-semibold'>
          Forgot your password?
        </h1>
        <p className='text-sm text-muted-foreground'>
          We&rsquo;ll email you a link to choose a new one.
        </p>
      </Reveal>
      <Reveal>
        <ForgotPasswordForm />
      </Reveal>
    </AuthShell>
  );
}
