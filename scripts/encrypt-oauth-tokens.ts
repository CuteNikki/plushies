// Usage: bun run encrypt-oauth-tokens [--write]
// Encrypts OAuth tokens stored before `encryptOAuthTokens` was turned on, the
// same way Better Auth does. Without --write it only reports what it would do.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';

import { PrismaClient } from '../lib/generated/prisma/client';

const write = process.argv.includes('--write');
const key = process.env.BETTER_AUTH_SECRET;
if (!key) {
  // Better Auth would fall back to a default key; tokens encrypted with that
  // couldn't be read by the site.
  console.error('BETTER_AUTH_SECRET is not set.');
  process.exit(1);
}

/** Better Auth's own check for tokens that are encrypted already. */
function isLikelyEncrypted(token: string) {
  if (token.startsWith('$ba$')) return true;
  return token.length % 2 === 0 && /^[0-9a-f]+$/i.test(token);
}

const fields = ['accessToken', 'refreshToken', 'idToken'] as const;

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const accounts = await db.account.findMany({
  where: { providerId: { not: 'credential' } },
  select: {
    id: true,
    providerId: true,
    accessToken: true,
    refreshToken: true,
    idToken: true,
  },
});

let tokens = 0;
for (const account of accounts) {
  const data: Partial<Record<(typeof fields)[number], string>> = {};
  for (const field of fields) {
    const token = account[field];
    if (!token || isLikelyEncrypted(token)) continue;
    const encrypted = await symmetricEncrypt({ key, data: token });
    // Make sure the site can read it back before replacing anything.
    if ((await symmetricDecrypt({ key, data: encrypted })) !== token) {
      throw new Error(`Round trip failed for ${account.id} ${field}`);
    }
    data[field] = encrypted;
  }
  const count = Object.keys(data).length;
  if (count === 0) continue;
  tokens += count;
  console.log(`${account.providerId} account ${account.id}: ${count} token(s)`);
  if (write) await db.account.update({ where: { id: account.id }, data });
}

console.log(
  tokens === 0
    ? 'Nothing to encrypt.'
    : write
      ? `Encrypted ${tokens} token(s).`
      : `Would encrypt ${tokens} token(s). Run with --write to do it.`
);
await db.$disconnect();
