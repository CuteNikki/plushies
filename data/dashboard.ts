import 'server-only';

import { ActivitySubject, ActivityType } from '@/lib/activity';
import { upcomingBirthday } from '@/lib/birthday';
import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { Role } from '@/lib/permissions';

/** How far ahead the dashboard looks for birthdays. */
export const BIRTHDAY_DAYS = 30;

/** How far back the dashboard counts changes and new accounts. */
export const RECENT_DAYS = 7;

/** How many rows each dashboard list shows. */
const LIST_SIZE = 5;

/** What a plushie still needs before its page is complete. */
export type Missing = 'thumbnail' | 'photos' | 'birthday' | 'species';

export type DashboardPlushie = {
  id: string;
  slug: string;
  name: string;
  thumbnail: { key: string; url: string } | null;
};

const plushieSelect = {
  id: true,
  slug: true,
  name: true,
  species: true,
  birthday: true,
  thumbnailKey: true,
  thumbnailUrl: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { gallery: true } },
} as const;

type PlushieRow = Prisma.PlushieGetPayload<{ select: typeof plushieSelect }>;

function toDashboardPlushie(row: PlushieRow): DashboardPlushie {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    thumbnail:
      row.thumbnailKey && row.thumbnailUrl
        ? { key: row.thumbnailKey, url: row.thumbnailUrl }
        : null,
  };
}

/** What the plushie's page still lacks. Empty once it's complete. */
function missingFrom(row: PlushieRow) {
  const missing: Missing[] = [];
  if (!row.thumbnailKey || !row.thumbnailUrl) missing.push('thumbnail');
  if (row._count.gallery === 0) missing.push('photos');
  if (!row.birthday) missing.push('birthday');
  if (!row.species) missing.push('species');
  return missing;
}

/**
 * Added and not changed since. The two times are set separately, so they
 * can be a moment apart.
 */
function isNew(row: PlushieRow) {
  return row.updatedAt.getTime() - row.createdAt.getTime() < 1000;
}

/**
 * Every plushie for the dashboard's plushie list, with what its views show:
 * photos and likes, when and by whom it was last changed, and what it lacks.
 */
export async function getPlushieList() {
  const [rows, edits] = await Promise.all([
    db.plushie.findMany({
      select: {
        ...plushieSelect,
        _count: { select: { gallery: true, likes: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    // The newest change to each plushie. The activity log only goes back so
    // far, so older changes have no name.
    db.activity.findMany({
      where: {
        subject: ActivitySubject.PLUSHIE,
        type: { in: [ActivityType.CREATED, ActivityType.UPDATED] },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['subjectId'],
      select: { subjectId: true, actorName: true },
    }),
  ]);
  const editors = new Map(
    edits.map((edit) => [edit.subjectId, edit.actorName])
  );

  return rows.map((row) => ({
    ...toDashboardPlushie(row),
    photos: row._count.gallery + (row.thumbnailKey ? 1 : 0),
    likes: row._count.likes,
    missing: missingFrom(row),
    updatedAt: row.updatedAt.toISOString(),
    isNew: isNew(row),
    editedBy: editors.get(row.id) ?? null,
  }));
}

/**
 * Everything on the dashboard overview. The queries run in parallel, so
 * together they cost about one round trip to the database.
 */
export async function getDashboard({ admin }: { admin: boolean }) {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const [
    rows,
    likes,
    recentChanges,
    comments,
    commentCount,
    recentCommentCount,
    roles,
    newAccounts,
    newAccountCount,
  ] = await Promise.all([
    db.plushie.findMany({
      select: plushieSelect,
      orderBy: { updatedAt: 'desc' },
    }),
    db.plushieLike.count(),
    // Editors don't see account changes on the activity page.
    db.activity.count({
      where: {
        createdAt: { gte: since },
        subject: admin ? undefined : { not: ActivitySubject.USER },
      },
    }),
    // Replies too, so editors see every new comment. Deleted ones are gone
    // already, or kept empty only for their replies.
    db.comment.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: LIST_SIZE,
      select: {
        id: true,
        body: true,
        createdAt: true,
        editedAt: true,
        author: { select: { id: true, name: true } },
        plushie: { select: { slug: true, name: true } },
      },
    }),
    db.comment.count({ where: { deletedAt: null } }),
    db.comment.count({
      where: { deletedAt: null, createdAt: { gte: since } },
    }),
    admin
      ? db.user.groupBy({ by: ['role'], _count: true })
      : Promise.resolve([]),
    admin
      ? db.user.findMany({
          where: { createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: LIST_SIZE,
          select: {
            id: true,
            name: true,
            createdAt: true,
            accounts: { select: { providerId: true } },
          },
        })
      : Promise.resolve([]),
    admin
      ? db.user.count({ where: { createdAt: { gte: since } } })
      : Promise.resolve(0),
  ]);

  const plushies = rows.map((row) => ({
    plushie: toDashboardPlushie(row),
    row,
    missing: missingFrom(row),
  }));

  const incomplete = plushies
    .filter(({ missing }) => missing.length > 0)
    .sort((a, b) => a.plushie.name.localeCompare(b.plushie.name));

  const birthdays = plushies
    .flatMap(({ plushie, row: { birthday } }) => {
      const upcoming = birthday
        ? upcomingBirthday(birthday, BIRTHDAY_DAYS)
        : null;
      return birthday && upcoming
        ? [{ ...plushie, birthday, ...upcoming }]
        : [];
    })
    // Month-only birthdays have no day, so they go after the dated ones.
    .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity));

  const withRole = (role: Role) =>
    roles.find((row) => row.role === role)?._count ?? 0;

  return {
    stats: {
      plushies: rows.length,
      photos: rows.reduce(
        (sum, row) => sum + row._count.gallery + (row.thumbnailKey ? 1 : 0),
        0
      ),
      likes,
      comments: commentCount,
      recentChanges,
    },
    recentlyEdited: plushies.slice(0, LIST_SIZE).map(({ plushie, row }) => ({
      ...plushie,
      updatedAt: row.updatedAt.toISOString(),
      isNew: isNew(row),
    })),
    needsAttention: {
      plushies: incomplete
        .slice(0, LIST_SIZE)
        .map(({ plushie, missing }) => ({ ...plushie, missing })),
      total: incomplete.length,
    },
    birthdays,
    comments: {
      latest: comments.map((comment) => ({
        ...comment,
        createdAt: comment.createdAt.toISOString(),
        editedAt: comment.editedAt?.toISOString() ?? null,
      })),
      recentCount: recentCommentCount,
    },
    users: admin
      ? {
          total: roles.reduce((sum, row) => sum + row._count, 0),
          admins: withRole(Role.ADMIN),
          editors: withRole(Role.EDITOR),
          newAccounts: newAccounts.map((user) => ({
            ...user,
            createdAt: user.createdAt.toISOString(),
          })),
          newAccountCount,
        }
      : null,
  };
}
