import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { BanIcon, HomeIcon, LogInIcon, ShieldCheckIcon } from 'lucide-react';

import { BAN_NOTICE_COOKIE, readBanNotice } from '@/lib/ban-notice';
import { isBanned } from '@/lib/bans';
import { db } from '@/lib/db';

import { AuthShell } from '@/components/auth-shell';
import { AuthStatus } from '@/components/auth-status';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Banned' };

/**
 * Where a banned account lands after trying to sign in. The reason is only
 * shown to whoever just tried, through the cookie that attempt set.
 */
export default async function BannedPage() {
  const userId = readBanNotice((await cookies()).get(BAN_NOTICE_COOKIE)?.value);
  const user = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { banned: true, banReason: true, banExpires: true },
      })
    : null;

  const home = (
    <Button asChild>
      <Link href='/'>
        <HomeIcon />
        Back Home
      </Link>
    </Button>
  );

  return (
    <AuthShell>
      <Reveal>
        {user && isBanned(user) ? (
          <AuthStatus
            icon={BanIcon}
            tone='destructive'
            titleAs='h1'
            title='Your account is banned'
            actions={home}
          >
            {user.banExpires ? (
              <>
                You can sign in again from{' '}
                <LocalTime iso={user.banExpires.toISOString()} absolute />.
              </>
            ) : (
              'You can’t sign in until an admin lifts the ban.'
            )}
            {user.banReason && (
              <span className='mt-3 block rounded-lg bg-muted px-3 py-2 text-left wrap-break-word whitespace-pre-line text-foreground'>
                {user.banReason}
              </span>
            )}
            <span className='mt-3 block'>
              Think this is a mistake? Get in touch through the{' '}
              <Link href='/imprint' className='text-primary hover:underline'>
                imprint
              </Link>
              .
            </span>
          </AuthStatus>
        ) : user ? (
          <AuthStatus
            icon={ShieldCheckIcon}
            titleAs='h1'
            title='Your ban has ended'
            actions={
              <Button asChild>
                <Link href='/sign-in'>
                  <LogInIcon />
                  Sign In
                </Link>
              </Button>
            }
          >
            You can sign in again.
          </AuthStatus>
        ) : (
          <AuthStatus
            icon={ShieldCheckIcon}
            titleAs='h1'
            title='Nothing to see here'
            actions={home}
          >
            This page explains a ban right after a banned account tries to sign
            in.
          </AuthStatus>
        )}
      </Reveal>
    </AuthShell>
  );
}
