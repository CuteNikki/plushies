import 'server-only';

import { trustedDevicesWhere } from '@/lib/auth';
import { db } from '@/lib/db';
import { getIpLocation } from '@/lib/ip-location';
import { describeUserAgent } from '@/lib/user-agent';

/** How signing in with a password asks for a second step, if at all. */
export type TwoFactorMethod = 'app' | 'email' | null;

/**
 * Sign-in methods, two-step sign-in, passkeys and sessions for the account page. Takes the signed-in
 * user's session, which the page has already checked.
 */
export async function getAccountSettings(current: {
  userId: string;
  sessionId: string;
}) {
  // Straight from the database: Better Auth's listSessions would check the
  // session cookie again first, a second round trip for the same answer.
  const [accounts, sessions, user, app, passkeys, trustedDevices] =
    await Promise.all([
      db.account.findMany({
        where: { userId: current.userId },
        select: { id: true, providerId: true },
      }),
      db.session.findMany({
        where: { userId: current.userId, expiresAt: { gt: new Date() } },
        orderBy: { updatedAt: 'desc' },
      }),
      db.user.findUniqueOrThrow({
        where: { id: current.userId },
        select: { twoFactorEnabled: true, nameResetAt: true },
      }),
      // An authenticator app counts once its first code confirmed it.
      db.twoFactor.findFirst({
        where: { userId: current.userId, verified: { not: false } },
        select: { id: true },
      }),
      db.passkey.findMany({
        where: { userId: current.userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, createdAt: true, backedUp: true },
      }),
      db.verification.count({
        where: {
          ...trustedDevicesWhere(current.userId),
          expiresAt: { gt: new Date() },
        },
      }),
    ]);
  const providers = accounts.map((account) => account.providerId);
  const twoFactor: TwoFactorMethod = !user.twoFactorEnabled
    ? null
    : app
      ? 'app'
      : 'email';

  const sessionInfos = await Promise.all(
    sessions.map(async (s) => {
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
        current: s.id === current.sessionId,
      };
    })
  );

  return {
    /** An editor or admin reset their name after reports. */
    nameReset: !!user.nameResetAt,
    providers,
    hasPassword: providers.includes('credential'),
    discordAccountId: accounts.find((a) => a.providerId === 'discord')?.id,
    sessions: sessionInfos,
    twoFactor,
    trustedDevices,
    passkeys: passkeys.map((passkey) => ({
      ...passkey,
      createdAt: passkey.createdAt?.toISOString() ?? null,
    })),
  };
}
