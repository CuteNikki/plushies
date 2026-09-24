import 'server-only';

import { db } from '@/lib/db';
import { getIpLocation } from '@/lib/ip-location';
import { describeUserAgent } from '@/lib/user-agent';

/**
 * Sign-in methods and sessions for the account page. Takes the signed-in
 * user's session, which the page has already checked.
 */
export async function getAccountSettings(current: {
  userId: string;
  sessionId: string;
}) {
  // Straight from the database: Better Auth's listSessions would check the
  // session cookie again first, a second round trip for the same answer.
  const [accounts, sessions] = await Promise.all([
    db.account.findMany({
      where: { userId: current.userId },
      select: { id: true, providerId: true },
    }),
    db.session.findMany({
      where: { userId: current.userId, expiresAt: { gt: new Date() } },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);
  const providers = accounts.map((account) => account.providerId);

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
    providers,
    hasPassword: providers.includes('credential'),
    discordAccountId: accounts.find((a) => a.providerId === 'discord')?.id,
    sessions: sessionInfos,
  };
}
