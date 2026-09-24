'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Loader2Icon } from 'lucide-react';

import { authClient } from '@/lib/auth-client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Mode = 'app' | 'email' | 'backup';

/**
 * Left in the tab by the sign-in form when it sends someone here, so the
 * email code goes out once per sign-in, not on every reload of this page.
 */
export const SEND_CODE_KEY = 'two-factor-send-code';

const messages: Record<string, string> = {
  INVALID_CODE: 'That code didn’t work. Try again.',
  INVALID_BACKUP_CODE: 'That backup code didn’t work, or was used already.',
  OTP_HAS_EXPIRED: 'That code has expired. Send a new one.',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
    'Too many tries with that code. Send a new one.',
  ACCOUNT_TEMPORARILY_LOCKED:
    'Too many wrong codes. Wait 15 minutes, then sign in again.',
};

/**
 * The second step of signing in with a password: a code from an
 * authenticator app, by email, or a backup code. `hasApp` says whether an
 * app is set up; email codes always work.
 */
export function TwoFactorForm({
  hasApp,
  next,
}: {
  hasApp: boolean;
  next: string;
}) {
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<Mode>(hasApp ? 'app' : 'email');
  const [error, setError] = useState<string>();
  const [expired, setExpired] = useState(false);
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [trust, setTrust] = useState(false);
  const autoSent = useRef(false);

  async function sendCode() {
    setSending(true);
    setError(undefined);
    const { error } = await authClient.twoFactor.sendOtp();
    setSending(false);
    if (error) return fail(error);
    setSent(true);
    toast.success('Code sent. Check your email.');
  }

  function fail(error: { code?: string; message?: string }) {
    if (error.code === 'INVALID_TWO_FACTOR_COOKIE') return setExpired(true);
    setError(
      (error.code && messages[error.code]) ??
        error.message ??
        'Something went wrong'
    );
  }

  useEffect(() => {
    // Without an app, the code comes by email: send it right away, once per
    // sign-in. Reloading the page leaves it to the "Send a code" button.
    if (hasApp || autoSent.current) return;
    autoSent.current = true;
    let justSignedIn = false;
    try {
      justSignedIn = sessionStorage.getItem(SEND_CODE_KEY) !== null;
      sessionStorage.removeItem(SEND_CODE_KEY);
    } catch {
      // Storage can be off, e.g. in private windows: the button still works.
    }
    if (justSignedIn) void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasApp]);

  async function verify(formData: FormData) {
    const code = String(formData.get('code')).trim();
    setPending(true);
    setError(undefined);
    const body = { code, trustDevice: trust };
    const { error } =
      mode === 'app'
        ? await authClient.twoFactor.verifyTotp(body)
        : mode === 'email'
          ? await authClient.twoFactor.verifyOtp(body)
          : await authClient.twoFactor.verifyBackupCode(body);
    setPending(false);
    if (error) {
      if (error.code === 'BANNED_USER') return router.push('/banned');
      return fail(error);
    }
    router.push(next);
    router.refresh();
  }

  if (expired) {
    return (
      <div className='flex flex-col gap-4 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10'>
        <p className='text-sm text-pretty text-muted-foreground'>
          This took too long, so you&rsquo;ll need to enter your password again.
        </p>
        <Button asChild>
          <Link href={`/sign-in?next=${encodeURIComponent(next)}`}>
            Sign in again
          </Link>
        </Button>
      </div>
    );
  }

  const labels: Record<Mode, string> = {
    app: 'Code from your authenticator app',
    email: 'Code from your email',
    backup: 'Backup code',
  };

  return (
    <div className='flex flex-col gap-4 rounded-2xl bg-card p-6 ring-1 ring-foreground/10'>
      <form action={verify} className='flex flex-col gap-3'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor={`${id}-code`}>{labels[mode]}</Label>
          <Input
            // A new field for each kind of code, so none carries over.
            key={mode}
            id={`${id}-code`}
            name='code'
            required
            autoFocus
            // Lets phones offer the code from a new email or text message.
            autoComplete='one-time-code'
            inputMode={mode === 'backup' ? 'text' : 'numeric'}
            maxLength={mode === 'backup' ? 20 : 6}
            className='text-center text-lg tracking-widest'
          />
        </div>
        {mode === 'email' && (
          <p className='text-xs text-muted-foreground'>
            {sending
              ? 'Sending a code…'
              : sent
                ? 'We sent a code to your email. It works for five minutes.'
                : null}{' '}
            <button
              type='button'
              onClick={sendCode}
              disabled={sending}
              className='font-medium text-primary hover:underline disabled:opacity-50'
            >
              {sent ? 'Send a new one' : 'Send a code'}
            </button>
          </p>
        )}
        <label
          htmlFor={`${id}-trust`}
          className='flex cursor-pointer items-center gap-2 text-sm'
        >
          <Checkbox
            id={`${id}-trust`}
            checked={trust}
            onCheckedChange={(checked) => setTrust(checked === true)}
          />
          Don&rsquo;t ask again on this device for 30 days
        </label>
        {error && <p className='text-sm text-destructive'>{error}</p>}
        <Button type='submit' disabled={pending}>
          {pending && <Loader2Icon className='animate-spin' />}
          Continue
        </Button>
      </form>

      <div className='flex flex-col items-center gap-1 text-sm'>
        {mode !== 'app' && hasApp && (
          <SwitchMode onClick={() => switchTo('app')}>
            Use your authenticator app
          </SwitchMode>
        )}
        {mode !== 'email' && (
          <SwitchMode
            onClick={() => {
              switchTo('email');
              if (!sent) void sendCode();
            }}
          >
            Email me a code instead
          </SwitchMode>
        )}
        {mode !== 'backup' && hasApp && (
          <SwitchMode onClick={() => switchTo('backup')}>
            Use a backup code
          </SwitchMode>
        )}
      </div>
    </div>
  );

  function switchTo(to: Mode) {
    setMode(to);
    setError(undefined);
  }
}

function SwitchMode({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='text-muted-foreground hover:text-primary hover:underline'
    >
      {children}
    </button>
  );
}
