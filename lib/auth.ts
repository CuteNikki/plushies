import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { APIError } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';

import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { ac, roles } from '@/lib/permissions';

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
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const u = user as typeof user & { role?: string | null };
        if (u.role !== 'admin') return;
        const admins = await db.user.count({ where: { role: 'admin' } });
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
    admin({ ac, roles, defaultRole: 'user', adminRoles: ['admin'] }),
    // Must be last: lets server actions set auth cookies.
    nextCookies(),
  ],
});

export type Session = typeof auth.$Infer.Session;
