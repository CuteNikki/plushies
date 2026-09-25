import type { Metadata } from 'next';

import { getAccountSettings } from '@/data/account';
import { requireUser } from '@/lib/session';

import { DeleteAccount } from '@/components/account/delete-account';
import { EmailSettings } from '@/components/account/email-settings';
import { LinkedAccounts } from '@/components/account/linked-accounts';
import { PasskeySettings } from '@/components/account/passkey-settings';
import { PasswordForm } from '@/components/account/password-form';
import { ProfileForm } from '@/components/account/profile-form';
import { SessionList } from '@/components/account/session-list';
import { TwoFactorSettings } from '@/components/account/two-factor-settings';
import { Reveal } from '@/components/motion';

export const metadata: Metadata = { title: 'Account Settings' };

export default async function AccountPage(props: PageProps<'/account'>) {
  const { user, session } = await requireUser();
  const { error } = await props.searchParams;

  const {
    providers,
    hasPassword,
    discordAccountId,
    sessions,
    twoFactor,
    trustedDevices,
    passkeys,
  } = await getAccountSettings({ userId: user.id, sessionId: session.id });

  return (
    <div className='mx-auto flex max-w-2xl flex-col gap-6'>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Account Settings
        </h1>
        <p className='text-pretty text-muted-foreground'>
          Manage your account settings and preferences.
        </p>
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
          discordAccountId={discordAccountId}
          error={typeof error === 'string' ? error : undefined}
        />
      </Section>

      <Section title='Two-Step Sign-In'>
        <TwoFactorSettings
          method={twoFactor}
          hasPassword={hasPassword}
          trustedDevices={trustedDevices}
        />
      </Section>

      <Section
        title='Passkeys'
        description='Sign in with your fingerprint, face or device PIN instead of a password. Passkeys only work on this device or the ones it syncs with.'
      >
        <PasskeySettings passkeys={passkeys} />
      </Section>

      <Section
        title='Sessions'
        description='Everywhere you are signed in right now.'
      >
        <SessionList sessions={sessions} />
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
          <p className='text-sm text-pretty text-muted-foreground'>
            {description}
          </p>
        )}
      </div>
      {children}
    </Reveal>
  );
}
