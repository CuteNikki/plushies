import 'server-only';

import type { Prisma } from '@/lib/generated/prisma/client';

type Tx = Prisma.TransactionClient;

/** The groups and the plushies outside one share these positions. */
async function lastOutside(tx: Tx) {
  const [plushie, group] = await Promise.all([
    tx.plushie.aggregate({
      where: { groupId: null },
      _max: { position: true },
    }),
    tx.plushieGroup.aggregate({ _max: { position: true } }),
  ]);
  return Math.max(plushie._max.position ?? 0, group._max.position ?? 0);
}

/** The next place in `groupId`, or outside a group for null. */
export async function nextPosition(tx: Tx, groupId: string | null) {
  if (!groupId) return (await lastOutside(tx)) + 1;
  const last = await tx.plushie.aggregate({
    where: { groupId },
    _max: { position: true },
  });
  return (last._max.position ?? 0) + 1;
}

/**
 * Moves everything after `position` down one, in `groupId` or outside a
 * group, and returns the place that frees up.
 */
export async function makeRoomAfter(
  tx: Tx,
  groupId: string | null,
  position: number
) {
  const after = { position: { gt: position } };
  const down = { position: { increment: 1 } };
  await tx.plushie.updateMany({ where: { groupId, ...after }, data: down });
  if (!groupId) {
    await tx.plushieGroup.updateMany({ where: after, data: down });
  }
  return position + 1;
}

/** The group with this name, ignoring case, if there is one. */
export function findGroup(tx: Tx, name: string) {
  return tx.plushieGroup.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
}

/** Groups whose last plushie left or was deleted. */
export function removeEmptyGroups(tx: Tx) {
  return tx.plushieGroup.deleteMany({ where: { plushies: { none: {} } } });
}
