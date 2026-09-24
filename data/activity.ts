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
};

/**
 * The latest entries, optionally only about plushies or users, or only the
 * ones about or by one account, with whether
 * each can be reverted or already was, and what the page needs to know about
 * plushies as they are now.
 */
export async function getActivity({
  subject,
  userId,
  canRevertAccounts,
  take = 200,
}: {
  subject?: ActivitySubject;
  /** Only changes to this account, or made by it. */
  userId?: string;
  /** Admins can revert account changes too. */
  canRevertAccounts: boolean;
  take?: number;
}) {
  const [entries, state] = await Promise.all([
    db.activity.findMany({
      where: {
        subject,
        createdAt: { gte: activityCutoff() },
        ...(userId && {
          OR: [
            { subject: ActivitySubject.USER, subjectId: userId },
            { actorId: userId },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
      take,
    }),
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
  };
  return {
    entries: entries.map((entry) => ({
      entry,
      revertedBy: revertedBy.get(entry.id) ?? null,
      revert:
        entry.subject === ActivitySubject.USER && !canRevertAccounts
          ? null
          : revertOption(entry, state),
    })),
    context,
  };
}
