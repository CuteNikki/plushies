import 'server-only';

import { after } from 'next/server';

import { activityCutoff, ActivitySubject, pruneActivity } from '@/lib/activity';
import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { PAGE_SIZES } from '@/lib/list-params';
import { loadRevertState, revertOption } from '@/lib/revert';

/** What the page knows about plushies as they are now. */
export type ActivityContext = {
  /** Current slug by plushie id, for plushies that still exist. */
  slugs: Map<string, string>;
  /** Photo URLs whose files still exist; the others show as deleted. */
  photos: Set<string>;
  /**
   * Accounts whose names link to their page: the ones that still exist,
   * and only for admins, who are the only ones who can open those pages.
   */
  users: Set<string>;
};

export const activitySorts = ['newest', 'oldest'] as const;

/**
 * The latest entries, a page at a time, optionally only about plushies or
 * users, or only the ones about or by one account, with whether each can be
 * reverted or already was, what the page needs to know about plushies as
 * they are now, and how many match across every page.
 */
export async function getActivity({
  subjects,
  userId,
  admin,
  take = PAGE_SIZES.default,
  page = 1,
  q = null,
  sort = 'newest',
}: {
  /** Only entries about these; all of them when left out. */
  subjects?: ActivitySubject[];
  /** Only changes to this account, or made by it. */
  userId?: string;
  /** Admins can revert account changes too, and open account pages. */
  admin: boolean;
  /** How many on a page. */
  take?: number;
  /** Counted from 1. */
  page?: number;
  /** Searches what an entry is about and who made it. */
  q?: string | null;
  sort?: (typeof activitySorts)[number];
}) {
  const contains = q && { contains: q, mode: 'insensitive' as const };
  const direction = sort === 'oldest' ? 'asc' : 'desc';
  const where: Prisma.ActivityWhereInput = {
    subject: subjects && { in: subjects },
    createdAt: { gte: activityCutoff() },
    AND: [
      userId
        ? {
            OR: [
              { subject: ActivitySubject.USER, subjectId: userId },
              { actorId: userId },
            ],
          }
        : {},
      contains
        ? { OR: [{ subjectName: contains }, { actorName: contains }] }
        : {},
    ],
  };
  const [entries, total, state] = await Promise.all([
    db.activity.findMany({
      where,
      // By id too, so entries from the same moment keep their order.
      orderBy: [{ createdAt: direction }, { id: direction }],
      skip: (page - 1) * take,
      take,
    }),
    db.activity.count({ where }),
    loadRevertState(),
  ]);
  const reverts = await db.activity.findMany({
    where: { revertOf: { in: entries.map((entry) => entry.id) } },
    select: { revertOf: true, actorName: true },
  });
  // Entries are also removed as new ones come in; this covers quiet times.
  after(pruneActivity);

  const revertedBy = new Map(
    reverts.map((revert) => [revert.revertOf!, revert.actorName ?? 'Someone'])
  );
  const context: ActivityContext = {
    slugs: new Map(
      [...state.plushies].map(([id, plushie]) => [id, plushie.slug])
    ),
    photos: state.photos,
    users: admin ? new Set(state.roles.keys()) : new Set(),
  };
  return {
    entries: entries.map((entry) => ({
      entry,
      revertedBy: revertedBy.get(entry.id) ?? null,
      revert:
        entry.subject === ActivitySubject.USER && !admin
          ? null
          : revertOption(entry, state),
    })),
    context,
    total,
  };
}
