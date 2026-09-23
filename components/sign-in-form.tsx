'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { authClient } from '@/lib/auth-client';

import { DiscordIcon } from '@/components/discord-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));
    const { error } =
      mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: String(formData.get('name')),
          });
    setPending(false);
    if (error) return setError(error.message ?? 'Something went wrong');
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className='flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10'>
      <form action={handleSubmit} className='flex flex-col gap-3'>
        {mode === 'sign-up' && (
          <div className='flex flex-col gap-1'>
            <Label htmlFor='name'>Name</Label>
            <Input id='name' name='name' required autoComplete='name' />
          </div>
        )}
        <div className='flex flex-col gap-1'>
          <Label htmlFor='email'>Email</Label>
          <Input
            id='email'
            name='email'
            type='email'
            required
            autoComplete='email'
          />
        </div>
        <div className='flex flex-col gap-1'>
          <div className='flex items-baseline justify-between'>
            <Label htmlFor='password'>Password</Label>
            {mode === 'sign-in' && (
              <Link
                href='/forgot-password'
                className='text-xs text-muted-foreground hover:text-primary hover:underline'
              >
                Forgot Password?
              </Link>
            )}
          </div>
          <Input
            id='password'
            name='password'
            type='password'
            required
            minLength={8}
            autoComplete={
              mode === 'sign-in' ? 'current-password' : 'new-password'
            }
          />
        </div>
        {error && <p className='text-sm text-destructive'>{error}</p>}
        <Button type='submit' disabled={pending}>
          {pending && <Loader2 className='animate-spin' />}
          {mode === 'sign-in' ? 'Sign in' : 'Create Account'}
        </Button>
      </form>

      <p className='text-center text-sm text-muted-foreground'>
        {mode === 'sign-in' ? 'No account yet? ' : 'Already have an account? '}
        <button
          type='button'
          className='font-medium text-primary hover:underline'
          onClick={() => {
            setError(undefined);
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
          }}
        >
          {mode === 'sign-in' ? 'Create account.' : 'Sign in.'}
        </button>
      </p>

      <div className='flex items-center gap-3 text-xs text-muted-foreground'>
        <span className='h-px flex-1 bg-border' />
        or
        <span className='h-px flex-1 bg-border' />
      </div>

      <Button
        variant='outline'
        size='lg'
        onClick={() =>
          authClient.signIn.social({
            provider: 'discord',
            callbackURL: '/dashboard',
          })
        }
      >
        <DiscordIcon />
        Use Discord
      </Button>

      {/* Covers every way of signing in above, including Discord. */}
      <p className='text-center text-xs text-balance text-muted-foreground'>
        By continuing, you agree to our{' '}
        <Link href='/terms' className='text-primary hover:underline'>
          terms of service
        </Link>{' '}
        and{' '}
        <Link href='/privacy' className='text-primary hover:underline'>
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
