import 'server-only';

import { db } from '@/lib/db';
import { ReportOutcome, UserReportOutcome } from '@/lib/generated/prisma/enums';

/**
 * Closes the open reports on these comments, as kept or deleted. By id as
 * reported, so it works on comments that are gone already.
 */
export function closeReports(
  commentIds: string[],
  outcome: ReportOutcome,
  resolvedById: string
) {
  return db.commentReport.updateMany({
    where: { reportedCommentId: { in: commentIds }, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedById, outcome },
  });
}

/** Closes the open reports about an account. */
export function closeUserReports(
  userId: string,
  outcome: UserReportOutcome,
  resolvedById: string
) {
  return db.userReport.updateMany({
    where: { reportedUserId: userId, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedById, outcome },
  });
}

/**
 * Closes open reports on comments and accounts that are gone, e.g. with a
 * deleted account, as deleted by no one in particular.
 */
export async function closeGoneReports() {
  await Promise.all([
    db.commentReport.updateMany({
      where: { commentId: null, resolvedAt: null },
      data: { resolvedAt: new Date(), outcome: ReportOutcome.DELETED },
    }),
    db.userReport.updateMany({
      where: { userId: null, resolvedAt: null },
      data: { resolvedAt: new Date(), outcome: UserReportOutcome.DELETED },
    }),
  ]);
}
