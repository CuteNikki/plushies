import { BadgeCheckIcon, BanIcon } from 'lucide-react';

import { providerLabels } from '@/lib/providers';

import { Badge } from '@/components/ui/badge';

/** Whether their email is verified, how they sign in, and if they're banned. */
export function UserBadges({
  user,
  banned,
}: {
  user: { emailVerified: boolean; accounts: { providerId: string }[] };
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
    </>
  );
}
