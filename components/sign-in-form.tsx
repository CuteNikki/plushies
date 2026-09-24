'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FingerprintIcon, Loader2Icon } from 'lucide-react';
import { DiscordIcon } from '@/components/discord-icon';

import { authClient } from '@/lib/auth-client';

import { SEND_CODE_KEY } from '@/components/two-factor-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/** `next` is where to go after signing in. */
export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  /**
   * Signs in with a passkey. With `autoFill`, the browser offers saved
   * passkeys in the email field's suggestions instead of opening a prompt.
   */
  async function signInWithPasskey(autoFill = false) {
    const result = await authClient.signIn.passkey({ autoFill });
    const error = result?.error;
    if (!error) {
      router.push(next);
      return router.refresh();
    }
    const code = 'code' in error ? error.code : undefined;
    if (code === 'BANNED_USER') return router.push('/banned');
    // Closing the browser's prompt, or ignoring the suggestions, is fine.
    if (autoFill || code === 'AUTH_CANCELLED' || code?.startsWith('ERROR_')) {
      return;
    }
    setError(error.message ?? 'That passkey didn’t work');
  }

  useEffect(() => {
    // Only where the browser can offer passkeys among the autofill
    // suggestions; elsewhere the button below opens its prompt.
    void window.PublicKeyCredential?.isConditionalMediationAvailable?.().then(
      (available) => {
        if (available) void signInWithPasskey(true);
      }
    );
    // Once, when the form shows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(undefined);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));
    const { data, error } =
      mode === 'sign-in'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({
            email,
            password,
            name: String(formData.get('name')),
            // Where the link in the verification email leads.
            callbackURL: '/verified',
          });
    setPending(false);
    // The ban notice cookie is set now, so the page can say why.
    if (error?.code === 'BANNED_USER') return router.push('/banned');
    if (error) return setError(error.message ?? 'Something went wrong');
    // Two-step sign-in is on: the code comes next, on its own page.
    if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect) {
      const methods =
        'twoFactorMethods' in data && Array.isArray(data.twoFactorMethods)
          ? (data.twoFactorMethods as string[])
          : [];
      const query = new URLSearchParams({ next, methods: methods.join(',') });
      try {
        sessionStorage.setItem(SEND_CODE_KEY, '1');
      } catch {
        // Without storage, the next page offers a button to send the code.
      }
      return router.push(`/two-factor?${query}`);
    }
    if (mode === 'sign-up') {
      toast.success('Account created! Check your inbox to verify your email.');
      router.push('/account');
    } else {
      router.push(next);
    }
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
            autoComplete={mode === 'sign-in' ? 'email webauthn' : 'email'}
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
          {pending && <Loader2Icon className='animate-spin' />}
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
            callbackURL: next,
            // Better Auth adds ?error=… to it.
            errorCallbackURL: `/sign-in?next=${encodeURIComponent(next)}`,
          })
        }
      >
        <DiscordIcon />
        Use Discord
      </Button>

      {mode === 'sign-in' && (
        <Button variant='outline' size='lg' onClick={() => signInWithPasskey()}>
          <FingerprintIcon />
          Use a passkey
        </Button>
      )}

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
