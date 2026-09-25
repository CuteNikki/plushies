import 'server-only';

import {
  ActivitySubject,
  ActivityType,
  writeActivity,
  type Actor,
  type BanSnapshot,
} from '@/lib/activity';
import type { BanDuration } from '@/lib/ban-options';
import { db } from '@/lib/db';

/**
 * Whether a ban is in force. Better Auth only lifts an expired ban when they
 * next try to sign in, so the flag alone can be out of date.
 */
export function isBanned(
  user: { banned: boolean | null; banExpires: Date | null },
  now = new Date()
) {
  return !!user.banned && (!user.banExpires || user.banExpires > now);
}

/** When a ban of `duration` given now ends; null for one until it's lifted. */
export function banExpiry(duration: BanDuration) {
  return duration === 'permanent'
    ? null
    : new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000);
}

export function banSnapshot(user: {
  banReason: string | null;
  banExpires: Date | null;
}): BanSnapshot {
  return {
    reason: user.banReason,
    expires: user.banExpires?.toISOString() ?? null,
  };
}

/**
 * Bans someone and ends all of their sessions. Straight to the database
 * rather than through Better Auth, which can't record who banned them.
 * Better Auth still refuses their sign-ins from the banned flag.
 */
export async function applyBan(
  user: { id: string; name: string },
  ban: { reason: string | null; expires: Date | null },
  actor: Actor,
  revertOf?: string
) {
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        banned: true,
        banReason: ban.reason,
        banExpires: ban.expires,
        bannedById: actor.id,
        bannedAt: new Date(),
      },
    }),
    db.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await writeActivity({
    type: ActivityType.BANNED,
    subject: ActivitySubject.USER,
    subjectId: user.id,
    subjectName: user.name,
    actor,
    after: banSnapshot({ banReason: ban.reason, banExpires: ban.expires }),
    revertOf,
  });
}

/** Lifts someone's ban before it ends by itself. */
export async function liftBan(
  user: {
    id: string;
    name: string;
    banReason: string | null;
    banExpires: Date | null;
  },
  actor: Actor,
  revertOf?: string
) {
  await db.user.update({
    where: { id: user.id },
    data: {
      banned: false,
      banReason: null,
      banExpires: null,
      bannedById: null,
      bannedAt: null,
    },
  });
  await writeActivity({
    type: ActivityType.UNBANNED,
    subject: ActivitySubject.USER,
    subjectId: user.id,
    subjectName: user.name,
    actor,
    before: banSnapshot(user),
    revertOf,
  });
}
