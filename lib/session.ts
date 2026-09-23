import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';
import { canEditPlushies } from '@/lib/permissions';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/** Redirects to sign in if signed out, or to /no-access if not an editor/admin. */
export async function requireEditor() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (!canEditPlushies(session.user.role)) redirect('/no-access');
  return session;
}

/** Redirects to sign in if signed out, or to /no-access if not an admin. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  if (session.user.role !== 'admin') redirect('/no-access');
  return session;
}

/** Redirects to sign in if signed out. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  return session;
}
