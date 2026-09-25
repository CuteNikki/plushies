import 'server-only';

import { db } from '@/lib/db';
import type {
  ReportOutcome,
  UserReportOutcome,
} from '@/lib/generated/prisma/enums';

/** Closes the open reports on these comments, as kept or deleted. */
export function closeReports(
  commentIds: string[],
  outcome: ReportOutcome,
  resolvedById: string
) {
  return db.commentReport.updateMany({
    where: { commentId: { in: commentIds }, resolvedAt: null },
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
    where: { userId, resolvedAt: null },
    data: { resolvedAt: new Date(), resolvedById, outcome },
  });
}
