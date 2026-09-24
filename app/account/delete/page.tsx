import type { Metadata } from 'next';
import Link from 'next/link';

import { LinkIcon, LogInIcon } from 'lucide-react';

import { getSession } from '@/lib/session';

import { ConfirmDeleteAccount } from '@/components/account/confirm-delete-account';
import { AuthShell } from '@/components/auth-shell';
import { AuthStatus } from '@/components/auth-status';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Delete Account' };

/** Where the link in the delete account email lands. */
export default async function DeleteAccountPage(
  props: PageProps<'/account/delete'>
) {
  const { token } = await props.searchParams;
  const session = await getSession();

  return (
    <AuthShell>
      <Reveal>
        {typeof token !== 'string' ? (
          <AuthStatus
            icon={LinkIcon}
            tone='destructive'
            titleAs='h1'
            title='That link didn’t work'
            actions={
              <Button asChild>
                <Link href='/account'>Go to account settings</Link>
              </Button>
            }
          >
            It is incomplete. Open the link from the email again.
          </AuthStatus>
        ) : !session ? (
          <AuthStatus
            icon={LogInIcon}
            titleAs='h1'
            title='Sign in to continue'
            actions={
              <Button asChild>
                <Link href='/sign-in'>Sign in</Link>
              </Button>
            }
          >
            For safety, the link only works in a browser where you&rsquo;re
            signed in. Sign in, then open the link from the email again.
          </AuthStatus>
        ) : (
          <ConfirmDeleteAccount token={token} name={session.user.name} />
        )}
      </Reveal>
    </AuthShell>
  );
}
