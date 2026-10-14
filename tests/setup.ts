/**
 * Loaded before every test file (see bunfig.toml). Refuses to run against
 * anything but a local database, and swaps in stand-ins for the parts of
 * Next.js and email that only work inside the real app.
 */
import { afterAll, beforeEach, mock } from 'bun:test';

import {
  assertTestDatabase,
  defer,
  request,
  resetRequest,
  sentEmails,
  settle,
  uploads,
} from './request';

assertTestDatabase();

mock.module('server-only', () => ({}));

const cookiesOutsideRequest = async () => {
  // What Next.js says, which Better Auth's nextCookies() knows to skip.
  throw new Error('`cookies` was called outside a request scope.');
};
const nextHeaders = () => ({
  headers: async () => new Headers({ cookie: request.cookie }),
  cookies: cookiesOutsideRequest,
});
mock.module('next/headers', nextHeaders);
mock.module('next/headers.js', nextHeaders);

mock.module('next/cache', () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
}));

mock.module('next/server', () => ({
  after: (task: (() => unknown) | Promise<unknown>) =>
    defer(typeof task === 'function' ? task : () => task),
}));

mock.module('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`Redirected to ${url}`);
  },
  notFound: () => {
    throw new Error('Not found');
  },
}));

// Emails are recorded instead of sent, so tests can read codes and links.
const record =
  (kind: string) =>
  async (to: string, ...args: string[]) => {
    sentEmails.push({ kind, to, args });
  };
mock.module('@/lib/email', () => ({
  sendPasswordResetEmail: record('password-reset'),
  sendVerificationEmail: record('verification'),
  sendEmailChangeConfirmation: record('email-change'),
  sendDeleteAccountEmail: record('delete-account'),
  sendTwoFactorCode: record('two-factor-code'),
}));

// The photo storage, as far as lib/uploads.ts uses it, over the files in `uploads`.
mock.module('@/lib/storage', () => ({
  async signUpload(key: string) {
    return `https://storage.test/${key}?signed`;
  },
  async listObjects(prefix: string) {
    return [...uploads.values()].filter((file) => file.key.startsWith(prefix));
  },
  async deleteObject(key: string) {
    uploads.delete(key);
  },
}));

beforeEach(async () => {
  await settle();
  resetRequest();
  const { resetDatabase } = await import('./helpers');
  await resetDatabase();
});

afterAll(async () => {
  await settle();
  const { db } = await import('@/lib/db');
  await db.$disconnect();
});
