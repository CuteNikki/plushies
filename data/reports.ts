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
          image: true,
          role: true,
          banned: true,
          banExpires: true,
          createdAt: true,
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
        image: author.image,
        role: author.role,
        banned: isBanned(author),
        joinedAt: author.createdAt.toISOString(),
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

/**
 * Accounts with reports no one has dealt with, the most recently reported
 * first, with those reports.
 */
export async function getOpenUserReports() {
  const users = await db.user.findMany({
    where: { reportsAgainst: { some: { resolvedAt: null } } },
    select: {
      id: true,
      name: true,
      image: true,
      role: true,
      banned: true,
      banExpires: true,
      createdAt: true,
      reportsAgainst: {
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

  return users
    .map(({ reportsAgainst, banExpires, banned, ...user }) => ({
      user: {
        ...user,
        banned: isBanned({ banned, banExpires }),
        createdAt: user.createdAt.toISOString(),
      },
      reports: reportsAgainst.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
      })),
    }))
    .sort((a, b) =>
      b.reports[0].createdAt.localeCompare(a.reports[0].createdAt)
    );
}

export type OpenUserReport = Awaited<
  ReturnType<typeof getOpenUserReports>
>[number];

/** Accounts waiting on someone to look at their reports. */
export function countOpenUserReports() {
  return db.user.count({
    where: { reportsAgainst: { some: { resolvedAt: null } } },
  });
}

/** How many closed reports the history loads, the latest first. */
const HISTORY_SIZE = 200;

const person = { select: { id: true, name: true } } as const;

/**
 * Reports closed together, e.g. by one Keep: what they were about, what
 * happened and who did it, and the reports themselves.
 */
function groupClosed<
  T extends {
    resolvedAt: Date | null;
    createdAt: Date;
  },
>(reports: T[], target: (report: T) => string) {
  const cases = new Map<string, T[]>();
  for (const report of reports) {
    const key = `${target(report)}:${report.resolvedAt?.toISOString()}`;
    cases.set(key, [...(cases.get(key) ?? []), report]);
  }
  return [...cases.entries()].map(([key, reports]) => ({ key, reports }));
}

function reportView(report: {
  id: string;
  note: string | null;
  createdAt: Date;
  reporter: { id: string; name: string } | null;
}) {
  return {
    id: report.id,
    note: report.note,
    createdAt: report.createdAt.toISOString(),
    reporter: report.reporter,
  };
}

/** Closed comment reports, newest first, a case per comment and closing. */
export async function getClosedReports() {
  const reports = await db.commentReport.findMany({
    where: { resolvedAt: { not: null } },
    orderBy: [{ resolvedAt: 'desc' }, { createdAt: 'desc' }],
    take: HISTORY_SIZE,
    include: { reporter: person, resolvedBy: person },
  });
  // The authors' pictures and the plushies' photos as they are now, for
  // what's still there.
  const [authors, plushies] = await Promise.all([
    db.user.findMany({
      where: {
        id: { in: reports.flatMap((report) => report.commentAuthorId ?? []) },
      },
      select: { id: true, image: true, createdAt: true },
    }),
    db.plushie.findMany({
      where: { slug: { in: reports.map((report) => report.plushieSlug) } },
      select: {
        id: true,
        slug: true,
        thumbnailKey: true,
        thumbnailUrl: true,
      },
    }),
  ]);
  const plushieIds = new Map(
    plushies.map((plushie) => [plushie.slug, plushie.id])
  );
  const authorInfo = new Map(authors.map((user) => [user.id, user]));
  const thumbnails = new Map(
    plushies.map((plushie) => [
      plushie.slug,
      plushie.thumbnailKey && plushie.thumbnailUrl
        ? { key: plushie.thumbnailKey, url: plushie.thumbnailUrl }
        : null,
    ])
  );
  return groupClosed(reports, (report) => report.reportedCommentId).map(
    ({ key, reports: [first, ...rest] }) => ({
      key,
      comment: {
        id: first.reportedCommentId,
        /** Whether it's still there, e.g. kept, to link to. */
        exists: !!first.commentId,
        body: first.commentBody,
        author: first.commentAuthorId
          ? {
              id: first.commentAuthorId,
              name: first.commentAuthorName!,
              image: authorInfo.get(first.commentAuthorId)?.image ?? null,
              /** Null once their account is gone. */
              joinedAt:
                authorInfo
                  .get(first.commentAuthorId)
                  ?.createdAt.toISOString() ?? null,
            }
          : null,
        plushie: {
          /** Null once there's no plushie by that URL name anymore. */
          id: plushieIds.get(first.plushieSlug) ?? null,
          name: first.plushieName,
          slug: first.plushieSlug,
          thumbnail: thumbnails.get(first.plushieSlug) ?? null,
        },
      },
      outcome: first.outcome!,
      resolvedAt: first.resolvedAt!.toISOString(),
      resolvedBy: first.resolvedBy,
      reports: [first, ...rest].map((report) => ({
        ...reportView(report),
        reason: report.reason,
      })),
    })
  );
}

export type ClosedReport = Awaited<ReturnType<typeof getClosedReports>>[number];

/** Closed account reports, newest first, a case per account and closing. */
export async function getClosedUserReports() {
  const reports = await db.userReport.findMany({
    where: { resolvedAt: { not: null } },
    orderBy: [{ resolvedAt: 'desc' }, { createdAt: 'desc' }],
    take: HISTORY_SIZE,
    include: {
      reporter: person,
      resolvedBy: person,
      user: { select: { id: true, name: true, image: true, createdAt: true } },
    },
  });
  return groupClosed(reports, (report) => report.reportedUserId).map(
    ({ key, reports: [first, ...rest] }) => ({
      key,
      user: {
        id: first.reportedUserId,
        /** Their name when reported, and now, if the account is still there. */
        reportedName: first.userName,
        name: first.user?.name ?? null,
        image: first.user?.image ?? null,
        joinedAt: first.user?.createdAt.toISOString() ?? null,
      },
      outcome: first.outcome!,
      resolvedAt: first.resolvedAt!.toISOString(),
      resolvedBy: first.resolvedBy,
      reports: [first, ...rest].map((report) => ({
        ...reportView(report),
        reason: report.reason,
      })),
    })
  );
}

export type ClosedUserReport = Awaited<
  ReturnType<typeof getClosedUserReports>
>[number];

/**
 * Every report to do with someone, open or closed, as cards like the
 * reports page's, newest first: about them (their account or their
 * comments), and ones they sent. Reports closed together, or still open
 * together, on the same comment or account share a card.
 */
export async function getReportsForUser(userId: string) {
  const include = {
    reporter: person,
    resolvedBy: person,
  } as const;
  const [aboutAccount, aboutComments, sentAccount, sentComments] =
    await Promise.all([
      db.userReport.findMany({
        where: { reportedUserId: userId },
        include,
        orderBy: { createdAt: 'desc' },
      }),
      db.commentReport.findMany({
        where: { commentAuthorId: userId },
        include,
        orderBy: { createdAt: 'desc' },
      }),
      db.userReport.findMany({
        where: { reporterId: userId },
        include,
        orderBy: { createdAt: 'desc' },
      }),
      db.commentReport.findMany({
        where: { reporterId: userId },
        include,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  // Who and what they're about, as they are now, for pictures and links.
  const accountReports = [...aboutAccount, ...sentAccount];
  const commentReports = [...aboutComments, ...sentComments];
  const [users, plushies] = await Promise.all([
    db.user.findMany({
      where: {
        id: {
          in: [
            ...accountReports.map((report) => report.reportedUserId),
            ...commentReports.flatMap((report) => report.commentAuthorId ?? []),
          ],
        },
      },
      select: { id: true, name: true, image: true, createdAt: true },
    }),
    db.plushie.findMany({
      where: {
        slug: { in: commentReports.map((report) => report.plushieSlug) },
      },
      select: { id: true, slug: true, thumbnailKey: true, thumbnailUrl: true },
    }),
  ]);
  const usersById = new Map(users.map((user) => [user.id, user]));
  const plushiesBySlug = new Map(
    plushies.map((plushie) => [plushie.slug, plushie])
  );

  function cases<T extends { resolvedAt: Date | null; createdAt: Date }>(
    reports: T[],
    target: (report: T) => string
  ) {
    const groups = new Map<string, T[]>();
    for (const report of reports) {
      const key = `${target(report)}:${report.resolvedAt?.toISOString() ?? 'open'}`;
      groups.set(key, [...(groups.get(key) ?? []), report]);
    }
    return [...groups.entries()].map(([key, group]) => ({ key, group }));
  }

  function status(group: typeof accountReports | typeof commentReports) {
    const [first] = group;
    return first.resolvedAt
      ? {
          open: false as const,
          resolvedAt: first.resolvedAt.toISOString(),
          resolvedBy: first.resolvedBy,
        }
      : {
          open: true as const,
          reports: group.length,
          latestAt: first.createdAt.toISOString(),
        };
  }

  const accountCases = (reports: typeof accountReports) =>
    cases(reports, (report) => report.reportedUserId).map(({ key, group }) => {
      const [first] = group;
      const user = usersById.get(first.reportedUserId);
      return {
        kind: 'user' as const,
        key: `u:${key}`,
        at: (first.resolvedAt ?? first.createdAt).toISOString(),
        status: status(group),
        outcome: first.outcome,
        user: {
          id: first.reportedUserId,
          reportedName: first.userName,
          name: user?.name ?? null,
          image: user?.image ?? null,
          joinedAt: user?.createdAt.toISOString() ?? null,
        },
        reports: group.map((report) => ({
          ...reportView(report),
          reason: report.reason,
        })),
      };
    });

  const commentCases = (reports: typeof commentReports) =>
    cases(reports, (report) => report.reportedCommentId).map(
      ({ key, group }) => {
        const [first] = group;
        const author = first.commentAuthorId
          ? usersById.get(first.commentAuthorId)
          : undefined;
        const plushie = plushiesBySlug.get(first.plushieSlug);
        return {
          kind: 'comment' as const,
          key: `c:${key}`,
          at: (first.resolvedAt ?? first.createdAt).toISOString(),
          status: status(group),
          outcome: first.outcome,
          comment: {
            id: first.reportedCommentId,
            exists: !!first.commentId,
            body: first.commentBody,
            author: first.commentAuthorId
              ? {
                  id: first.commentAuthorId,
                  name: first.commentAuthorName!,
                  image: author?.image ?? null,
                  joinedAt: author?.createdAt.toISOString() ?? null,
                }
              : null,
            plushie: {
              id: plushie?.id ?? null,
              name: first.plushieName,
              slug: first.plushieSlug,
              thumbnail:
                plushie?.thumbnailKey && plushie.thumbnailUrl
                  ? { key: plushie.thumbnailKey, url: plushie.thumbnailUrl }
                  : null,
            },
          },
          reports: group.map((report) => ({
            ...reportView(report),
            reason: report.reason,
          })),
        };
      }
    );

  const newest = (x: { at: string }, y: { at: string }) =>
    y.at.localeCompare(x.at);
  return {
    about: [...accountCases(aboutAccount), ...commentCases(aboutComments)].sort(
      newest
    ),
    sent: [...accountCases(sentAccount), ...commentCases(sentComments)].sort(
      newest
    ),
  };
}

export type ReportCase = Awaited<
  ReturnType<typeof getReportsForUser>
>['about'][number];

/** Reports about comments and accounts together, still open and closed. */
export async function countReports() {
  const [openComments, openUsers, allComments, allUsers] = await Promise.all([
    db.commentReport.count({ where: { resolvedAt: null } }),
    db.userReport.count({ where: { resolvedAt: null } }),
    db.commentReport.count(),
    db.userReport.count(),
  ]);
  const open = openComments + openUsers;
  return { open, closed: allComments + allUsers - open };
}

/** How many reports there are across these cards. */
export function reportsIn(cases: { reports: unknown[] }[]) {
  return cases.reduce((sum, item) => sum + item.reports.length, 0);
}
