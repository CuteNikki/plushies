import type { Metadata } from 'next';
import { headers } from 'next/headers';

import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/session';
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

  return (
    <div className='mx-auto flex max-w-2xl flex-col gap-6'>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Account settings
        </h1>
        <p className='text-muted-foreground'>Signed in as {user.email}</p>
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
        title='Sign-in methods'
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
        <SessionList
          sessions={sessions
            .toSorted((a, b) => +b.updatedAt - +a.updatedAt)
            .map((s) => ({
              id: s.id,
              device: describeUserAgent(s.userAgent),
              // Local development records an all-zero address; hide it.
              ipAddress:
                s.ipAddress && !/^[0:.]+$/.test(s.ipAddress)
                  ? s.ipAddress
                  : null,
              lastActive: s.updatedAt.toISOString(),
              current: s.id === session.id,
            }))}
        />
      </Section>

      <Section title='Danger zone'>
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
