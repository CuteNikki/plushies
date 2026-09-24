import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { BetterAuthPlugin } from 'better-auth';

import { isBanned } from '@/lib/bans';
import { db } from '@/lib/db';

/**
 * Remembers which banned account just tried to sign in, so /banned can say
 * why without anyone else being able to look up a ban. Signed, so it can't
 * be made up, and short-lived.
 */
export const BAN_NOTICE_COOKIE = 'ban_notice';

const MAX_AGE_SECONDS = 15 * 60;

function signature(payload: string) {
  return createHmac('sha256', process.env.BETTER_AUTH_SECRET!)
    .update(`${BAN_NOTICE_COOKIE}:${payload}`)
    .digest('base64url');
}

function sign(userId: string) {
  const payload = `${userId}.${Date.now() + MAX_AGE_SECONDS * 1000}`;
  return `${payload}.${signature(payload)}`;
}

/** The account the cookie was made for, or null if it's invalid or old. */
export function readBanNotice(value: string | undefined) {
  const [userId, expires, given] = value?.split('.') ?? [];
  if (!userId || !expires || !given) return null;
  const expected = Buffer.from(signature(`${userId}.${expires}`));
  const actual = Buffer.from(given);
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected) ||
    Number(expires) < Date.now()
  ) {
    return null;
  }
  return userId;
}

/**
 * Sets the ban notice cookie when a banned account tries to sign in. Must
 * come before the admin plugin, whose own check refuses the sign-in: plugin
 * hooks run in order, and nothing after that refusal runs.
 */
export function banNotice() {
  return {
    id: 'ban-notice',
    init() {
      return {
        options: {
          databaseHooks: {
            session: {
              create: {
                async before(session, ctx) {
                  // Admins viewing as someone get a plain error instead.
                  if (!ctx || ctx.path === '/admin/impersonate-user') return;
                  const user = await db.user.findUnique({
                    where: { id: session.userId },
                    select: { banned: true, banExpires: true },
                  });
                  if (!user?.banned) return;
                  if (!isBanned(user)) {
                    // Ended by itself. The admin plugin clears the rest of
                    // the ban next, but doesn't know these fields.
                    await db.user.update({
                      where: { id: session.userId },
                      data: { bannedById: null, bannedAt: null },
                    });
                    return;
                  }
                  ctx.setCookie(BAN_NOTICE_COOKIE, sign(session.userId), {
                    httpOnly: true,
                    sameSite: 'lax',
                    secure: ctx.context.baseURL.startsWith('https://'),
                    path: '/',
                    maxAge: MAX_AGE_SECONDS,
                  });
                },
              },
            },
          },
        },
      };
    },
  } satisfies BetterAuthPlugin;
}
