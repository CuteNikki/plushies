'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CheckIcon, Loader2Icon, MailIcon } from 'lucide-react';
import { DiscordIcon } from '@/components/discord-icon';

import { authClient } from '@/lib/auth-client';

import { Button } from '@/components/ui/button';

export function LinkedAccounts({
  providers,
  discordAccountId,
  error,
}: {
  providers: string[];
  discordAccountId?: string;
  /** Set by Better Auth when linking fails and it redirects back here. */
  error?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const hasDiscord = !!discordAccountId;
  const hasPassword = providers.includes('credential');

  useEffect(() => {
    if (!error) return;
    toast.error(
      error === 'account_already_linked_to_different_user'
        ? 'That Discord account is already used by another account here'
        : "Couldn't connect Discord, try again"
    );
    router.replace('/account');
  }, [error, router]);

  async function connectDiscord() {
    setPending(true);
    const { error } = await authClient.linkSocial({
      provider: 'discord',
      callbackURL: '/account',
      errorCallbackURL: '/account',
    });
    // On success the browser is sent off to Discord.
    if (error) {
      setPending(false);
      toast.error(error.message ?? "Couldn't connect Discord");
    }
  }

  async function disconnectDiscord() {
    setPending(true);
    const { error } = await authClient.unlinkAccount({
      accountId: discordAccountId!,
    });
    setPending(false);
    if (error) {
      toast.error(
        error.code === 'SESSION_EXPIRED'
          ? 'For safety, sign out and back in, then try again'
          : (error.message ?? 'Something went wrong')
      );
      return;
    }
    toast.success('Discord disconnected');
    router.refresh();
  }

  return (
    <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
      <li className='flex items-center gap-3 p-3 px-4'>
        <MailIcon className='size-5 text-muted-foreground' />
        <span className='flex-1 font-medium'>Email and password</span>
        {hasPassword ? (
          <Button variant='secondary' size='sm' disabled>
            <CheckIcon />
            Done
          </Button>
        ) : (
          <span className='text-sm text-muted-foreground'>
            Missing Password
          </span>
        )}
      </li>
      <li className='flex items-center gap-3 p-3 px-4'>
        <DiscordIcon className='size-5 text-muted-foreground' />
        <span className='flex-1 font-medium'>Discord</span>
        {hasDiscord ? (
          <Button
            variant='destructive'
            size='sm'
            disabled={pending || !hasPassword}
            title={
              hasPassword
                ? undefined
                : 'Add a password first, so you can still sign in'
            }
            onClick={disconnectDiscord}
          >
            {pending && <Loader2Icon className='animate-spin' />}
            Disconnect
          </Button>
        ) : (
          <Button size='sm' disabled={pending} onClick={connectDiscord}>
            {pending && <Loader2Icon className='animate-spin' />}
            Connect
          </Button>
        )}
      </li>
    </ul>
  );
}
