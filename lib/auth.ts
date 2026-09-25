import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
  isAPIError,
} from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { admin, twoFactor } from 'better-auth/plugins';

import { withAccountActivity } from '@/lib/activity';
import { banNotice } from '@/lib/ban-notice';
import { db } from '@/lib/db';
import {
  sendDeleteAccountEmail,
  sendEmailChangeConfirmation,
  sendPasswordResetEmail,
  sendTwoFactorCode,
  sendVerificationEmail,
} from '@/lib/email';
import {
  ac,
  isAdmin,
  Role,
  roles,
  VIEWING_AS_MESSAGE,
} from '@/lib/permissions';
import { site } from '@/lib/site';

/** Where the auth endpoints run. Passkeys only work on this site. */
const authURL = new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000');

/** What still works while an admin views the site as someone else. */
const allowedWhileViewingAs = new Set([
  '/get-session',
  '/list-sessions',
  '/list-accounts',
  '/passkey/list-user-passkeys',
  '/sign-out',
  '/admin/stop-impersonating',
]);

/**
 * Where Better Auth keeps the devices that skip two-step sign-in ("Don't ask
 * again"), one verification row each, holding the user's id.
 */
export function trustedDevicesWhere(userId: string) {
  return {
    identifier: { startsWith: 'trust-device-' },
    value: userId,
  };
}

/** Makes every device ask for a code again at the next sign-in. */
export async function forgetTrustedDevices(userId: string) {
  await db.verification.deleteMany({ where: trustedDevicesWhere(userId) });
}

/** Stops the only admin from deleting their account and leaving none. */
async function assertNotLastAdmin(user: { role?: string | null }) {
  if (!isAdmin(user.role)) return;
  const admins = await db.user.count({ where: { role: Role.ADMIN } });
  if (admins <= 1) {
    throw new APIError('BAD_REQUEST', {
      message:
        "You're the only admin. Make someone else an admin before deleting your account.",
    });
  }
}

export const auth = betterAuth({
  // Logs account changes to the activity page as Better Auth makes them.
  database: prismaAdapter(withAccountActivity(db), { provider: 'postgresql' }),
  emailAndPassword: {
    enabled: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Not awaited, so the response time doesn't reveal whether the email exists.
      void sendPasswordResetEmail(user.email, user.name, url).catch((error) =>
        console.error('Failed to send password reset email', error)
      );
    },
  },
  emailVerification: {
    // Sent automatically after signing up with email, and on request from
    // the account page. Discord accounts are verified by Discord already.
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    sendVerificationEmail: async ({ user, url }) => {
      // During an email change, the last link goes to the new address, which
      // no account uses yet. It gets its own wording and landing message.
      const changing = !(await db.user.findUnique({
        where: { email: user.email },
        select: { id: true },
      }));
      void sendVerificationEmail(
        user.email,
        user.name,
        changing ? withCallback(url, '/verified?step=changed') : url,
        changing
      ).catch((error) =>
        console.error('Failed to send verification email', error)
      );
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    },
  },
  account: {
    // Discord's access and refresh tokens aren't used after sign-in, but
    // shouldn't sit in the database readable either.
    encryptOAuthTokens: true,
    accountLinking: {
      // Linking happens while signed in, from the account page, so the
      // Discord email doesn't have to match the one used to sign up.
      allowDifferentEmails: true,
    },
  },
  user: {
    changeEmail: {
      enabled: true,
      // Unverified addresses may have a typo, so they change right away and
      // get a new verification link.
      updateEmailWithoutVerification: true,
      // Verified addresses first confirm from the current address, so a
      // stolen session can't quietly take over the account.
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        void sendEmailChangeConfirmation(
          user.email,
          user.name,
          newEmail,
          withCallback(url, '/verified?step=confirmed')
        ).catch((error) =>
          console.error('Failed to send email change confirmation', error)
        );
      },
    },
    deleteUser: {
      enabled: true,
      // Deleting always needs a link from the account's email, so a stolen
      // session or an unlocked computer isn't enough. The last-admin check
      // runs when it's asked for (in hooks) and again when it happens.
      sendDeleteAccountVerification: async ({ user, url, token }) => {
        const link = new URL('/account/delete', new URL(url).origin);
        link.searchParams.set('token', token);
        void sendDeleteAccountEmail(
          user.email,
          user.name,
          link.toString()
        ).catch((error) =>
          console.error('Failed to send delete account email', error)
        );
      },
      deleteTokenExpiresIn: 60 * 60,
      beforeDelete: (user) =>
        assertNotLastAdmin(user as typeof user & { role?: string }),
    },
  },
  rateLimit: {
    // On in production only, per IP address. Sign-in codes are emails, so
    // they get a tighter limit than the default 100 requests per 10 seconds.
    customRules: {
      '/two-factor/send-otp': { window: 60, max: 3 },
    },
  },
  hooks: {
    // Viewing as someone is for looking only: nothing on their account can be
    // changed until the admin stops. Plushie actions check this themselves.
    before: createAuthMiddleware(async (ctx) => {
      if (allowedWhileViewingAs.has(ctx.path)) return;
      const session = await getSessionFromCtx(ctx);
      if (session?.session.impersonatedBy) {
        throw new APIError('FORBIDDEN', { message: VIEWING_AS_MESSAGE });
      }
      // Asking to delete: check before the email goes out. Errors thrown while
      // sending it are only logged, so the page would still say "sent".
      if (ctx.path === '/delete-user' && !ctx.body?.token && session) {
        await assertNotLastAdmin(session.user as { role?: string });
      }
    }),
    // Turning two-step sign-in off forgets every trusted device, not just
    // this one as Better Auth does, so turning it back on asks everywhere.
    after: createAuthMiddleware(async (ctx) => {
      if (isAPIError(ctx.context.returned)) return;
      if (ctx.path === '/two-factor/disable') {
        const session = await getSessionFromCtx(ctx);
        if (session) await forgetTrustedDevices(session.user.id);
      }
      // A new name after an editor or admin reset theirs: stop asking.
      if (ctx.path === '/update-user' && ctx.body?.name) {
        const session = await getSessionFromCtx(ctx);
        if (session) {
          await db.user.updateMany({
            where: { id: session.user.id, nameResetAt: { not: null } },
            data: { nameResetAt: null },
          });
        }
      }
    }),
  },
  plugins: [
    // Before admin(), whose ban check stops sign-ins before later hooks run.
    banNotice(),
    admin({
      ac,
      roles,
      defaultRole: Role.USER,
      adminRoles: [Role.ADMIN],
      bannedUserMessage: 'This account is banned.',
    }),
    // Two-step sign-in, for signing in with a password: a code from an
    // authenticator app or by email, or a backup code. Discord and passkeys
    // have their own protection, so they skip it.
    twoFactor({
      issuer: site.name,
      otpOptions: {
        period: 5,
        // Only a hash is kept, like a password.
        storeOTP: 'hashed',
        sendOTP: ({ user, otp }) => {
          void sendTwoFactorCode(user.email, user.name, otp).catch((error) =>
            console.error('Failed to send sign-in code', error)
          );
        },
      },
    }),
    passkey({
      rpID: authURL.hostname,
      rpName: site.name,
      origin: authURL.origin,
    }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;

/** Changes where a Better Auth email link leads once it has been used. */
function withCallback(url: string, callbackURL: string) {
  const link = new URL(url);
  link.searchParams.set('callbackURL', callbackURL);
  return link.toString();
}
