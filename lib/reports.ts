import 'server-only';

import { db } from '@/lib/db';
import type { ReportOutcome } from '@/lib/generated/prisma/enums';

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
