import 'server-only';

import { after } from 'next/server';

import { activityCutoff, ActivitySubject, pruneActivity } from '@/lib/activity';
import { db } from '@/lib/db';
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

/** How many entries the activity page shows at a time. */
export const ACTIVITY_PAGE_SIZE = 30;

export const activitySorts = ['newest', 'oldest'] as const;

/**
 * The latest entries, a page at a time, optionally only about plushies or
 * users, or only the ones about or by one account, with whether each can be
 * reverted or already was, and what the page needs to know about plushies as
 * they are now. `next` is the cursor for the page after, if there is one.
 */
export async function getActivity({
  subjects,
  userId,
  admin,
  take = ACTIVITY_PAGE_SIZE,
  cursor = null,
  q = null,
  sort = 'newest',
}: {
  /** Only entries about these; all of them when left out. */
  subjects?: ActivitySubject[];
  /** Only changes to this account, or made by it. */
  userId?: string;
  /** Admins can revert account changes too, and open account pages. */
  admin: boolean;
  take?: number;
  /** The last entry of the page before. */
  cursor?: string | null;
  /** Searches what an entry is about and who made it. */
  q?: string | null;
  sort?: (typeof activitySorts)[number];
}) {
  const contains = q && { contains: q, mode: 'insensitive' as const };
  const direction = sort === 'oldest' ? 'asc' : 'desc';
  const [rows, state] = await Promise.all([
    db.activity.findMany({
      where: {
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
      },
      // By id too, so entries from the same moment keep their order.
      orderBy: [{ createdAt: direction }, { id: direction }],
      take: take + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    }),
    loadRevertState(),
  ]);
  const entries = rows.slice(0, take);
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
    next: rows.length > take ? entries.at(-1)!.id : null,
  };
}
