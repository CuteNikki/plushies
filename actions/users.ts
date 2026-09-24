'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { ActivitySubject, ActivityType, logActivity } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isAdmin, isRole, Role } from '@/lib/permissions';
import { getSession } from '@/lib/session';

/**
 * Only admins can manage users, and never their own account from here.
 * Returns who is doing it, for the activity log.
 */
async function assertCanManage(userId: string) {
  const session = await getSession();
  if (!isAdmin(session?.user.role)) {
    throw new Error('Only admins can do that');
  }
  if (session.user.id === userId) {
    throw new Error("You can't do that to your own account");
  }
  return { id: session.user.id, name: session.user.name };
}

export async function setUserRole(userId: string, role: string) {
  await assertCanManage(userId);
  if (!isRole(role)) throw new Error('Unknown role');

  await auth.api.setRole({
    body: { userId, role },
    headers: await headers(),
  });
  revalidatePath('/dashboard/users');
}

export async function sendUserPasswordReset(userId: string) {
  const actor = await assertCanManage(userId);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Also works for Discord-only accounts: it adds a password to them.
  await auth.api.requestPasswordReset({
    body: { email: user.email, redirectTo: '/reset-password' },
  });
  logActivity({
    type: ActivityType.PASSWORD_RESET_SENT,
    subject: ActivitySubject.USER,
    subjectId: user.id,
    subjectName: user.name,
    actor,
  });
}

export async function signOutUser(userId: string) {
  const actor = await assertCanManage(userId);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  await auth.api.revokeUserSessions({
    body: { userId },
    headers: await headers(),
  });
  logActivity({
    type: ActivityType.SIGNED_OUT,
    subject: ActivitySubject.USER,
    subjectId: user.id,
    subjectName: user.name,
    actor,
  });
}

export async function deleteUser(userId: string) {
  await assertCanManage(userId);
  await auth.api.removeUser({ body: { userId }, headers: await headers() });
  revalidatePath('/dashboard/users');
}

/**
 * Lets an admin see the site as someone else, e.g. to check what editors or
 * viewers see. Only for looking: changes are turned off until they stop.
 */
export async function viewAsUser(userId: string) {
  const actor = await assertCanManage(userId);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (user.role === Role.ADMIN) {
    throw new Error("Admins can't view the site as other admins");
  }

  await auth.api.impersonateUser({
    body: { userId },
    headers: await headers(),
  });
  logActivity({
    type: ActivityType.IMPERSONATED,
    subject: ActivitySubject.USER,
    subjectId: user.id,
    subjectName: user.name,
    actor,
  });
}

/** Switches back to the admin's own session. */
export async function stopViewingAs() {
  await auth.api.stopImpersonating({ headers: await headers() });
}
