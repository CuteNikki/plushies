'use server';

import { revalidatePath } from 'next/cache';

import { BAN_REASON_MAX, isBanDuration } from '@/lib/ban-options';
import { applyBan, banExpiry, isBanned } from '@/lib/bans';
import { commentViewer } from '@/lib/comments';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { ReportOutcome, Role } from '@/lib/generated/prisma/enums';
import {
  canEditPlushies,
  isAdmin,
  isViewingAs,
  VIEWING_AS_MESSAGE,
} from '@/lib/permissions';
import {
  isReportReason,
  REPORT_NOTE_MAX,
  REPORT_WINDOW_HOURS,
  REPORTS_PER_HOUR,
  REPORTS_TO_HIDE,
} from '@/lib/report-rules';
import { closeReports } from '@/lib/reports';
import { getSession } from '@/lib/session';

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const blockedMessages = {
  'signed-out': 'Sign in to report comments',
  unverified: 'Verify your email address to report comments',
};

/**
 * Reports someone else's comment, once. Enough reports from different people
 * in a short time hide it until an editor or admin looks at it.
 */
export async function reportComment(
  commentId: string,
  input: { reason: string; note: string }
): Promise<Result<{ hidden: boolean }>> {
  const session = await getSession();
  const viewer = await commentViewer(session);
  if (viewer.viewingAs) return { ok: false, error: VIEWING_AS_MESSAGE };
  if (!session || viewer.blocked) {
    return {
      ok: false,
      error: blockedMessages[viewer.blocked ?? 'signed-out'],
    };
  }
  if (!isReportReason(input.reason)) {
    return { ok: false, error: 'Pick what’s wrong with it' };
  }
  const note = input.note.trim() || null;
  if (note && note.length > REPORT_NOTE_MAX) {
    return {
      ok: false,
      error: `Keep the note under ${REPORT_NOTE_MAX} characters`,
    };
  }

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true, deletedAt: true, hiddenAt: true },
  });
  if (!comment || comment.deletedAt) {
    return { ok: false, error: 'That comment no longer exists' };
  }
  if (comment.authorId === session.user.id) {
    return { ok: false, error: 'You can’t report your own comment' };
  }

  const recent = await db.commentReport.count({
    where: {
      reporterId: session.user.id,
      createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
    },
  });
  if (recent >= REPORTS_PER_HOUR) {
    return { ok: false, error: 'That’s a lot of reports. Try again later.' };
  }

  try {
    await db.commentReport.create({
      data: {
        commentId,
        reporterId: session.user.id,
        reason: input.reason,
        note,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { ok: false, error: 'You reported this comment already' };
    }
    throw error;
  }

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
  const reason = input.reason.trim() || null;
  if (reason && reason.length > BAN_REASON_MAX) {
    return { error: `Keep the reason under ${BAN_REASON_MAX} characters` };
  }
  if (!isBanDuration(input.duration)) return { error: 'Pick how long' };

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
  if (author.id === user.id) return { error: 'You can’t ban yourself' };
  if (author.role === Role.ADMIN) return { error: 'Admins can’t be banned' };
  if (author.role !== Role.USER && !isAdmin(user.role)) {
    return { error: 'Only admins can ban editors' };
  }
  if (isBanned(author)) return { error: 'They’re banned already' };

  await applyBan(
    author,
    { reason, expires: banExpiry(input.duration) },
    { id: user.id, name: user.name }
  );
  revalidatePath('/dashboard', 'layout');
  return {};
}
