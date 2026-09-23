import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';

import { db } from '@/lib/db';
import {
  sendEmailChangeConfirmation,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '@/lib/email';
import { ac, isAdmin, Role, roles } from '@/lib/permissions';

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: 'postgresql' }),
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
      beforeDelete: async (user) => {
        const u = user as typeof user & { role?: string | null };
        if (!isAdmin(u.role)) return;
        const admins = await db.user.count({ where: { role: Role.ADMIN } });
        if (admins <= 1) {
          throw new APIError('BAD_REQUEST', {
            message:
              "You're the only admin. Make someone else an admin before deleting your account.",
          });
        }
      },
    },
  },
  plugins: [
    admin({
      ac,
      roles,
      defaultRole: Role.USER,
      adminRoles: [Role.ADMIN],
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
