import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
import { getIpLocation } from '@/lib/ip-location';
import { describeUserAgent } from '@/lib/user-agent';

import { DeleteAccount } from '@/components/account/delete-account';
import { EmailSettings } from '@/components/account/email-settings';
import { LinkedAccounts } from '@/components/account/linked-accounts';
import { PasswordForm } from '@/components/account/password-form';
import { ProfileForm } from '@/components/account/profile-form';
import { SessionList } from '@/components/account/session-list';
import { Reveal } from '@/components/motion';

export const metadata: Metadata = { title: 'Account settings' };

export default async function AccountPage(props: PageProps<'/account'>) {
  const { user, session } = await requireUser();
  const { error } = await props.searchParams;

  const [accounts, sessions] = await Promise.all([
    db.account.findMany({
      where: { userId: user.id },
      select: { id: true, providerId: true },
    }),
    auth.api.listSessions({ headers: await headers() }),
  ]);
  const providers = accounts.map((account) => account.providerId);
  const hasPassword = providers.includes('credential');

  const sessionInfos = await Promise.all(
    sessions
      .toSorted((a, b) => +b.updatedAt - +a.updatedAt)
      .map(async (s) => {
        const location = await getIpLocation(s.ipAddress);
        return {
          id: s.id,
          device: describeUserAgent(s.userAgent),
          // Local development records an all-zero address; hide it.
          ipAddress:
            s.ipAddress && !/^[0:.]+$/.test(s.ipAddress) ? s.ipAddress : null,
          location: location
            ? [location.country, location.provider].filter(Boolean).join(' · ')
            : null,
          createdAt: s.createdAt.toISOString(),
          lastActive: s.updatedAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
          current: s.id === session.id,
        };
      })
  );

  return (
    <div className='mx-auto flex max-w-2xl flex-col gap-6'>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Account Settings
        </h1>
        <p className='text-muted-foreground'>Manage your account settings and preferences.</p>
      </Reveal>

      <Section title='Profile'>
        <ProfileForm name={user.name} />
      </Section>

      <Section title='Email'>
        <EmailSettings email={user.email} verified={user.emailVerified} />
      </Section>

      <Section
        title='Password'
        description={
          hasPassword
            ? undefined
            : 'You sign in with Discord. Add a password to also sign in with your email.'
        }
      >
        <PasswordForm hasPassword={hasPassword} />
      </Section>

      <Section
        title='Sign-in Methods'
        description='Connect Discord to sign in with it too, whichever way you signed up.'
      >
        <LinkedAccounts
          providers={providers}
          discordAccountId={
            accounts.find((a) => a.providerId === 'discord')?.id
          }
          error={typeof error === 'string' ? error : undefined}
        />
      </Section>

      <Section
        title='Sessions'
        description='Everywhere you are signed in right now.'
      >
        <SessionList sessions={sessionInfos} />
      </Section>

      <Section title='Danger Zone'>
        <DeleteAccount hasPassword={hasPassword} />
      </Section>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal as='section' className='flex flex-col gap-4'>
      <div>
        <h2 className='font-heading text-xl font-semibold'>{title}</h2>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      {children}
    </Reveal>
  );
}
