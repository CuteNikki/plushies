'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { auth, forgetTrustedDevices as forget } from '@/lib/auth';
import { db } from '@/lib/db';
import { isViewingAs, VIEWING_AS_MESSAGE } from '@/lib/permissions';
import { getSession } from '@/lib/session';

export type ActionResult = { error?: string };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong';
}

/** For accounts without a password yet, e.g. signed up with Discord. */
export async function setPassword(newPassword: string): Promise<ActionResult> {
  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    });
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath('/account');
  return {};
}

export async function revokeSession(sessionId: string): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: 'Not signed in' };

  // Look up by id so session tokens never have to be sent to the browser.
  const target = await db.session.findFirst({
    where: { id: sessionId, userId: session.user.id },
  });
  if (!target) return { error: 'That session has already ended' };

  await auth.api.revokeSession({
    body: { token: target.token },
    headers: await headers(),
  });
  revalidatePath('/account');
  return {};
}

/**
 * Makes every device ask for a code again, including this one. Their
 * "Don't ask again" cookies stay, but no longer count for anything.
 */
export async function forgetTrustedDevices(): Promise<ActionResult> {
  const session = await getSession();
  if (!session) return { error: 'Not signed in' };
  // Straight to the database, so Better Auth's hook doesn't catch this.
  if (isViewingAs(session)) return { error: VIEWING_AS_MESSAGE };

  await forget(session.user.id);
  revalidatePath('/account');
  return {};
}

export async function revokeOtherSessions(): Promise<ActionResult> {
  await auth.api.revokeOtherSessions({ headers: await headers() });
  revalidatePath('/account');
  return {};
}
