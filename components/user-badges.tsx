import {
  BadgeCheckIcon,
  BanIcon,
  FingerprintIcon,
  ShieldCheckIcon,
} from 'lucide-react';

import { providerLabels } from '@/lib/providers';

import { Badge } from '@/components/ui/badge';

/**
 * Whether their email is verified, how they sign in, whether they use
 * two-step sign-in or passkeys, and if they're banned.
 */
export function UserBadges({
  user,
  passkeys,
  banned,
}: {
  user: {
    emailVerified: boolean;
    twoFactorEnabled: boolean | null;
    accounts: { providerId: string }[];
  };
  /** How many passkeys they have. */
  passkeys: number;
  /** Whether a ban is in force; see isBanned. */
  banned: boolean;
}) {
  return (
    <>
      {banned && (
        <Badge variant='destructive'>
          <BanIcon />
          Banned
        </Badge>
      )}
      {user.emailVerified ? (
        <Badge>
          <BadgeCheckIcon />
          Verified
        </Badge>
      ) : (
        <Badge variant='outline'>Unverified</Badge>
      )}
      {user.accounts.map(({ providerId }) => (
        <Badge key={providerId} variant='secondary'>
          {providerLabels[providerId] ?? providerId}
        </Badge>
      ))}
      {passkeys > 0 && (
        <Badge variant='secondary'>
          <FingerprintIcon />
          {passkeys === 1 ? 'Passkey' : `${passkeys} passkeys`}
        </Badge>
      )}
      {user.twoFactorEnabled && (
        <Badge variant='secondary'>
          <ShieldCheckIcon />
          Two-step
        </Badge>
      )}
    </>
  );
}
