'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { ActivitySubject, ActivityType, logActivity } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { BAN_REASON_MAX, isBanDuration } from '@/lib/ban-options';
import { applyBan, isBanned, liftBan } from '@/lib/bans';
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

export async function setUserRole(
  userId: string,
  role: string
): Promise<{ error?: string }> {
  await assertCanManage(userId);
  if (!isRole(role)) throw new Error('Unknown role');
  if (role === Role.ADMIN) {
    const user = await db.user.findUnique({ where: { id: userId } });
    // Admins can't be banned, so a banned admin couldn't be unbanned.
    if (user && isBanned(user)) {
      return { error: 'Lift their ban before making them an admin' };
    }
  }

  await auth.api.setRole({
    body: { userId, role },
    headers: await headers(),
  });
  revalidatePath('/dashboard/users', 'layout');
  return {};
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
  revalidatePath('/dashboard/users', 'layout');
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
  // Better Auth won't start a session for them.
  if (isBanned(user)) throw new Error("Banned accounts can't be viewed as");

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

/**
 * Bans someone: they're signed out everywhere and can't sign in until the
 * ban ends or is lifted. Admins can't be banned; make them an editor first.
 */
export async function banUser(
  userId: string,
  input: { reason: string; duration: string }
): Promise<{ error?: string }> {
  const actor = await assertCanManage(userId);
  const reason = input.reason.trim();
  if (!reason) return { error: 'Give a reason, so they know why' };
  if (reason.length > BAN_REASON_MAX) {
    return { error: `Keep the reason under ${BAN_REASON_MAX} characters` };
  }
  if (!isBanDuration(input.duration)) return { error: 'Pick how long' };

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: 'This account no longer exists' };
  if (user.role === Role.ADMIN) return { error: "Admins can't be banned" };

  const expires =
    input.duration === 'permanent'
      ? null
      : new Date(Date.now() + Number(input.duration) * 24 * 60 * 60 * 1000);
  await applyBan(user, { reason, expires }, actor);
  revalidatePath('/dashboard/users', 'layout');
  return {};
}

/** Lifts someone's ban before it ends by itself. */
export async function unbanUser(userId: string): Promise<{ error?: string }> {
  const actor = await assertCanManage(userId);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: 'This account no longer exists' };
  if (!isBanned(user)) return { error: 'They aren’t banned anymore' };

  await liftBan(user, actor);
  revalidatePath('/dashboard/users', 'layout');
  return {};
}
