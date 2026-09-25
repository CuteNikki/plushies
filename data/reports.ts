import 'server-only';

import { commentRowSelect, toCommentRow } from '@/data/comment-rows';
import { isBanned } from '@/lib/bans';
import { db } from '@/lib/db';

/**
 * Comments with reports no one has dealt with, the most recently reported
 * first, each with those reports and whether its author can be banned.
 * "[deleted]" ones are left out; deleting closes their reports anyway.
 */
export async function getOpenReports() {
  const rows = await db.comment.findMany({
    where: { deletedAt: null, reports: { some: { resolvedAt: null } } },
    select: {
      ...commentRowSelect,
      author: {
        select: {
          id: true,
          name: true,
          role: true,
          banned: true,
          banExpires: true,
        },
      },
      reports: {
        where: { resolvedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          reason: true,
          note: true,
          createdAt: true,
          reporter: { select: { id: true, name: true } },
        },
      },
    },
  });

  return rows
    .map(({ reports, author, ...row }) => ({
      comment: toCommentRow({
        ...row,
        author: author && { id: author.id, name: author.name },
      }),
      author: author && {
        id: author.id,
        name: author.name,
        role: author.role,
        banned: isBanned(author),
      },
      reports: reports.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
      })),
    }))
    .sort((a, b) =>
      b.reports[0].createdAt.localeCompare(a.reports[0].createdAt)
    );
}

export type OpenReport = Awaited<ReturnType<typeof getOpenReports>>[number];

/** Comments waiting on someone to look at their reports. */
export function countOpenReports() {
  return db.comment.count({
    where: { deletedAt: null, reports: { some: { resolvedAt: null } } },
  });
}
