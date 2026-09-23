import type { Metadata } from 'next';
import Link from 'next/link';

import { ResetPasswordForm } from '@/components/reset-password-form';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Reset password' };

export default async function ResetPasswordPage(
  props: PageProps<'/reset-password'>
) {
  const { token, error } = await props.searchParams;

  return (
    <div className='mx-auto flex max-w-sm flex-col gap-6 py-8'>
      <div className='flex flex-col gap-1 text-center'>
        <h1 className='font-heading text-3xl font-semibold'>
          Choose a new password
        </h1>
      </div>
      {typeof token === 'string' && !error ? (
        <ResetPasswordForm token={token} />
      ) : (
        <div className='flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10'>
          <p className='text-sm text-muted-foreground'>
            This reset link is invalid or has expired. Links work for one hour.
          </p>
          <Button asChild>
            <Link href='/forgot-password'>Send a new link</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
