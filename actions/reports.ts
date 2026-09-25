'use server';

import { revalidatePath } from 'next/cache';

import { ActivitySubject, ActivityType, writeActivity } from '@/lib/activity';
import { BAN_REASON_MAX, isBanDuration } from '@/lib/ban-options';
import { applyBan, banExpiry, isBanned } from '@/lib/bans';
import { commentViewer } from '@/lib/comments';
import { db } from '@/lib/db';
import {
  ReportOutcome,
  Role,
  UserReportOutcome,
  UserReportReason,
} from '@/lib/generated/prisma/enums';
import {
  canEditPlushies,
  isAdmin,
  isViewingAs,
  VIEWING_AS_MESSAGE,
} from '@/lib/permissions';
import {
  isReportReason,
  isUserReportReason,
  REPORT_NOTE_MAX,
  REPORT_WINDOW_HOURS,
  REPORTS_PER_HOUR,
  REPORTS_TO_HIDE,
} from '@/lib/report-rules';
import { closeReports, closeUserReports } from '@/lib/reports';
import { getSession } from '@/lib/session';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };
type Failed = { ok: false; error: string };

const blockedMessages = {
  'signed-out': 'Sign in to report',
  unverified: 'Verify your email address to report',
};

/**
 * Who is reporting, if they may: signed in, verified, not viewing as
 * someone, and not over REPORTS_PER_HOUR. Also checks the note.
 */
async function reporter(
  note: string
): Promise<{ ok: true; userId: string; note: string | null } | Failed> {
  const session = await getSession();
  const viewer = await commentViewer(session);
  if (viewer.viewingAs) return { ok: false, error: VIEWING_AS_MESSAGE };
  if (!session || viewer.blocked) {
    return {
      ok: false,
      error: blockedMessages[viewer.blocked ?? 'signed-out'],
    };
  }
  const trimmed = note.trim() || null;
  if (trimmed && trimmed.length > REPORT_NOTE_MAX) {
    return {
      ok: false,
      error: `Keep the note under ${REPORT_NOTE_MAX} characters`,
    };
  }
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recent = await Promise.all([
    db.commentReport.count({
      where: { reporterId: session.user.id, createdAt: { gte: since } },
    }),
    db.userReport.count({
      where: { reporterId: session.user.id, createdAt: { gte: since } },
    }),
  ]);
  if (recent[0] + recent[1] >= REPORTS_PER_HOUR) {
    return { ok: false, error: 'That’s a lot of reports. Try again later.' };
  }
  return { ok: true, userId: session.user.id, note: trimmed };
}

/**
 * Reports someone else's comment. Again once an editor or admin has dealt
 * with the last one. Enough reports from different people in a short time
 * hide it until an editor or admin looks at it.
 */
export async function reportComment(
  commentId: string,
  input: { reason: string; note: string }
): Promise<Result<{ hidden: boolean }>> {
  if (!isReportReason(input.reason)) {
    return { ok: false, error: 'Pick what’s wrong with it' };
  }
  const who = await reporter(input.note);
  if (!who.ok) return who;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: {
      body: true,
      authorId: true,
      deletedAt: true,
      hiddenAt: true,
      author: { select: { name: true } },
      plushie: { select: { name: true, slug: true } },
    },
  });
  if (!comment || comment.deletedAt) {
    return { ok: false, error: 'That comment no longer exists' };
  }
  if (comment.authorId === who.userId) {
    return { ok: false, error: 'You can’t report your own comment' };
  }
  const open = await db.commentReport.count({
    where: {
      reportedCommentId: commentId,
      reporterId: who.userId,
      resolvedAt: null,
    },
  });
  if (open) return { ok: false, error: 'You reported this comment already' };

  await db.commentReport.create({
    data: {
      commentId,
      reporterId: who.userId,
      reason: input.reason,
      note: who.note,
      // As it was, for the history, even once it's edited or deleted.
      reportedCommentId: commentId,
      commentBody: comment.body,
      commentAuthorId: comment.authorId,
      commentAuthorName: comment.author?.name ?? null,
      plushieName: comment.plushie.name,
      plushieSlug: comment.plushie.slug,
    },
  });

  // Reports closed by keeping it don't count again.
  let hidden = !!comment.hiddenAt;
  if (!hidden) {
    const reports = await db.commentReport.count({
      where: {
        commentId,
        resolvedAt: null,
        createdAt: {
          gte: new Date(Date.now() - REPORT_WINDOW_HOURS * 60 * 60 * 1000),
        },
      },
    });
    if (reports >= REPORTS_TO_HIDE) {
      await db.comment.update({
        where: { id: commentId },
        data: { hiddenAt: new Date() },
      });
      hidden = true;
    }
  }
  revalidatePath('/dashboard', 'layout');
  return { ok: true, hidden };
}

/**
 * Reports someone's account, e.g. for their name or picture. Again once an
 * editor or admin has dealt with the last one, as their name may change.
 */
export async function reportUser(
  userId: string,
  input: { reason: string; note: string }
): Promise<Result> {
  if (!isUserReportReason(input.reason)) {
    return { ok: false, error: 'Pick what’s wrong' };
  }
  const who = await reporter(input.note);
  if (!who.ok) return who;
  if (userId === who.userId) {
    return { ok: false, error: 'You can’t report yourself' };
  }

  const [user, open] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { name: true } }),
    db.userReport.count({
      where: { userId, reporterId: who.userId, resolvedAt: null },
    }),
  ]);
  if (!user) return { ok: false, error: 'That account no longer exists' };
  if (open) return { ok: false, error: 'You reported them already' };

  await db.userReport.create({
    data: {
      userId,
      reporterId: who.userId,
      reason: input.reason,
      note: who.note,
      // Their name then, e.g. the one that was the problem.
      reportedUserId: userId,
      userName: user.name,
    },
  });
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

/** Editors and admins deal with reports. Returns who is doing it. */
async function moderator() {
  const session = await getSession();
  if (!canEditPlushies(session?.user.role)) {
    throw new Error('Only editors and admins can deal with reports');
  }
  if (isViewingAs(session)) throw new Error(VIEWING_AS_MESSAGE);
  return session.user;
}

/**
 * Why `actor` can't ban or reset `target` from a report, or null if they
 * can: admins can act on anyone but admins; editors only on regular accounts.
 * Never on themselves.
 */
function cannotActOn(
  actor: { id: string; role?: string | null },
  target: { id: string; role: string }
) {
  if (target.id === actor.id) return 'You can’t do that to yourself';
  if (target.role === Role.ADMIN) return 'That can’t be done to admins';
  if (target.role !== Role.USER && !isAdmin(actor.role)) {
    return 'Only admins can do that to editors';
  }
  return null;
}

function parseBan(input: { reason: string; duration: string }) {
  const reason = input.reason.trim() || null;
  if (reason && reason.length > BAN_REASON_MAX) {
    return { error: `Keep the reason under ${BAN_REASON_MAX} characters` };
  }
  if (!isBanDuration(input.duration)) return { error: 'Pick how long' };
  return { reason, expires: banExpiry(input.duration) };
}

/**
 * Keeps a reported comment: closes its reports, and shows it again if they
 * had hidden it. Deleting it closes them too; see deleteComment.
 */
export async function keepComment(commentId: string): Promise<Result> {
  const user = await moderator();
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { deletedAt: true },
  });
  if (!comment || comment.deletedAt) {
    return { ok: false, error: 'That comment no longer exists' };
  }
  await db.$transaction([
    db.comment.update({ where: { id: commentId }, data: { hiddenAt: null } }),
    closeReports([commentId], ReportOutcome.KEPT, user.id),
  ]);
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

/**
 * Bans the author of a reported comment. Admins can ban anyone they could
 * from the users page; editors only regular accounts, and only from a report.
 */
export async function banCommentAuthor(
  commentId: string,
  input: { reason: string; duration: string }
): Promise<{ error?: string }> {
  const user = await moderator();
  const ban = parseBan(input);
  if ('error' in ban) return ban;

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: {
      author: true,
      _count: { select: { reports: { where: { resolvedAt: null } } } },
    },
  });
  if (!comment?._count.reports) {
    return { error: 'That comment has no open reports anymore' };
  }
  const { author } = comment;
  if (!author) return { error: 'Their account no longer exists' };
  const problem = cannotActOn(user, author);
  if (problem) return { error: problem };
  if (isBanned(author)) return { error: 'They’re banned already' };

  await applyBan(author, ban, { id: user.id, name: user.name });
  revalidatePath('/dashboard', 'layout');
  return {};
}

/** A reported account, if it still has open reports and they can act on it. */
async function reportedUser(
  actor: { id: string; role?: string | null },
  userId: string
): Promise<
  { ok: true; user: NonNullable<Awaited<ReturnType<typeof findUser>>> } | Failed
> {
  const user = await findUser(userId);
  if (!user) return { ok: false, error: 'That account no longer exists' };
  if (!user._count.reportsAgainst) {
    return { ok: false, error: 'They have no open reports anymore' };
  }
  const problem = cannotActOn(actor, user);
  if (problem) return { ok: false, error: problem };
  return { ok: true, user };
}

function findUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: { reportsAgainst: { where: { resolvedAt: null } } },
      },
      // What they're open for, e.g. a name to reset.
      reportsAgainst: {
        where: { resolvedAt: null },
        select: { reason: true },
      },
    },
  });
}

/** Closes someone's reports: nothing wrong with their account. */
export async function dismissUserReports(userId: string): Promise<Result> {
  const actor = await moderator();
  await closeUserReports(userId, UserReportOutcome.DISMISSED, actor.id);
  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}

/**
 * Resets a reported account's name to a neutral one, or removes its picture,
 * and closes its reports. Their account page asks them for a new name. The
 * name change is logged with who did it; it can't be undone from there, as
 * the old name was the problem.
 */
export async function resetReportedUser(
  userId: string,
  what: 'name' | 'picture'
): Promise<Result<{ name: string }>> {
  const actor = await moderator();
  const found = await reportedUser(actor, userId);
  if (!found.ok) return found;
  const { user } = found;
  // Only what someone reported, e.g. not the name for harassment.
  const reason =
    what === 'name' ? UserReportReason.NAME : UserReportReason.PICTURE;
  if (!user.reportsAgainst.some((report) => report.reason === reason)) {
    return {
      ok: false,
      error: `No one reported their ${what}`,
    };
  }

  if (what === 'picture') {
    if (!user.image) return { ok: false, error: 'They have no picture' };
    await db.user.update({ where: { id: userId }, data: { image: null } });
  } else {
    const name = `Plushie friend ${Math.floor(1000 + Math.random() * 9000)}`;
    await db.user.update({
      where: { id: userId },
      data: { name, nameResetAt: new Date() },
    });
    await writeActivity({
      type: ActivityType.UPDATED,
      subject: ActivitySubject.USER,
      subjectId: userId,
      subjectName: name,
      actor: { id: actor.id, name: actor.name },
      before: userSnapshot(user),
      after: userSnapshot({ ...user, name }),
    });
  }
  await closeUserReports(userId, UserReportOutcome.RESET, actor.id);
  revalidatePath('/', 'layout');
  return { ok: true, name: user.name };
}

function userSnapshot(user: {
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
}) {
  return {
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
  };
}

/** Bans a reported account and closes its reports. */
export async function banReportedUser(
  userId: string,
  input: { reason: string; duration: string }
): Promise<{ error?: string }> {
  const actor = await moderator();
  const ban = parseBan(input);
  if ('error' in ban) return ban;
  const found = await reportedUser(actor, userId);
  if (!found.ok) return { error: found.error };
  if (isBanned(found.user)) return { error: 'They’re banned already' };

  await applyBan(found.user, ban, { id: actor.id, name: actor.name });
  await closeUserReports(userId, UserReportOutcome.BANNED, actor.id);
  revalidatePath('/dashboard', 'layout');
  return {};
}
