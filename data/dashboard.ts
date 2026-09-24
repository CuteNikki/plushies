import 'server-only';

import { ActivitySubject } from '@/lib/activity';
import { upcomingBirthday } from '@/lib/birthday';
import { db } from '@/lib/db';
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

/**
 * Everything on the dashboard overview. The queries run in parallel, so
 * together they cost about one round trip to the database.
 */
export async function getDashboard({ admin }: { admin: boolean }) {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000);
  const [rows, likes, recentChanges, roles, newAccounts, newAccountCount] =
    await Promise.all([
      db.plushie.findMany({
        select: {
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
        },
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

  const plushies = rows.map((row) => {
    const plushie: DashboardPlushie = {
      id: row.id,
      slug: row.slug,
      name: row.name,
      thumbnail:
        row.thumbnailKey && row.thumbnailUrl
          ? { key: row.thumbnailKey, url: row.thumbnailUrl }
          : null,
    };
    const missing: Missing[] = [];
    if (!plushie.thumbnail) missing.push('thumbnail');
    if (row._count.gallery === 0) missing.push('photos');
    if (!row.birthday) missing.push('birthday');
    if (!row.species) missing.push('species');
    return { plushie, row, missing };
  });

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
      recentChanges,
    },
    recentlyEdited: plushies.slice(0, LIST_SIZE).map(({ plushie, row }) => ({
      ...plushie,
      updatedAt: row.updatedAt.toISOString(),
      // Added and not changed since. The two times are set separately, so
      // they can be a moment apart.
      isNew: row.updatedAt.getTime() - row.createdAt.getTime() < 1000,
    })),
    needsAttention: {
      plushies: incomplete
        .slice(0, LIST_SIZE)
        .map(({ plushie, missing }) => ({ ...plushie, missing })),
      total: incomplete.length,
    },
    birthdays,
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
