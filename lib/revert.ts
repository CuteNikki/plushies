import 'server-only';

import {
  ActivitySubject,
  ActivityType,
  plushieSnapshot,
  same,
  snapshotPhotos,
  type BanSnapshot,
  type PlushieSnapshot,
  type UserSnapshot,
} from '@/lib/activity';
import { banSnapshot, isBanned } from '@/lib/bans';
import { db } from '@/lib/db';
import type { Activity } from '@/lib/generated/prisma/client';
import { isAdmin, isRole, roleLabels } from '@/lib/permissions';
import { retainedPhotos } from '@/lib/uploads';

/** How things are now, which decides what can still be reverted. */
export type RevertState = {
  /** Plushies that exist now, by id. */
  plushies: Map<string, PlushieSnapshot>;
  /** Everyone's role now, by user id. */
  roles: Map<string, string>;
  /** The ban in force now, by user id, for everyone who is banned. */
  bans: Map<string, BanSnapshot>;
  /** Photo URLs whose files still exist. */
  photos: Set<string>;
};

export async function loadRevertState(): Promise<RevertState> {
  const [plushies, users, retained] = await Promise.all([
    db.plushie.findMany({
      include: { gallery: { orderBy: { position: 'asc' } } },
    }),
    db.user.findMany({
      select: {
        id: true,
        role: true,
        banned: true,
        banReason: true,
        banExpires: true,
      },
    }),
    retainedPhotos(),
  ]);
  const snapshots = new Map(
    plushies.map((plushie) => [plushie.id, plushieSnapshot(plushie)])
  );
  return {
    plushies: snapshots,
    roles: new Map(users.map((user) => [user.id, user.role])),
    bans: new Map(
      users
        .filter((user) => isBanned(user))
        .map((user) => [user.id, banSnapshot(user)])
    ),
    photos: new Set([
      ...retained,
      ...[...snapshots.values()].flatMap(snapshotPhotos),
    ]),
  };
}

export type RevertOption = {
  /** The button's text. */
  label: string;
  /** Asked before reverting. */
  confirm: string;
};

/** The keys whose values differ between two snapshots. */
export function changedKeys<T extends object>(before: T, after: T) {
  return (Object.keys(after) as (keyof T)[]).filter(
    (key) => !same(before[key], after[key])
  );
}

/**
 * Whether an entry can be reverted, given how things are now, and how the
 * button reads. Null when it can't: reverts never overwrite newer changes,
 * so anything changed again since, plushies deleted since, URL names taken
 * since, or photos older than the retention time block it.
 */
export function revertOption(
  entry: Activity,
  state: RevertState
): RevertOption | null {
  const name = entry.subjectName;

  if (entry.subject === ActivitySubject.USER) {
    if (entry.type === ActivityType.BANNED) {
      // Only the same ban, still in force: not one that ended or replaced it.
      const ban = state.bans.get(entry.subjectId);
      if (!ban || !same(ban, entry.after)) return null;
      return { label: 'Unban', confirm: `Lift ${name}’s ban?` };
    }
    if (entry.type === ActivityType.UNBANNED) {
      const before = entry.before as BanSnapshot;
      const role = state.roles.get(entry.subjectId);
      // Not if they're gone, banned again since, or an admin now.
      if (!role || isAdmin(role) || state.bans.has(entry.subjectId)) {
        return null;
      }
      // Nor once the ban would have ended by itself anyway.
      if (before.expires && new Date(before.expires) <= new Date()) {
        return null;
      }
      return { label: 'Ban again', confirm: `Ban ${name} again?` };
    }
    if (entry.type !== ActivityType.UPDATED) return null;
    const before = entry.before as UserSnapshot;
    const after = entry.after as UserSnapshot;
    // Only roles: undoing someone's own name or email change isn't ours to do.
    if (before.role === after.role) return null;
    if (state.roles.get(entry.subjectId) !== after.role) return null;
    const role = isRole(before.role) ? roleLabels[before.role] : before.role;
    return {
      label: 'Revert role',
      confirm: `Make ${name} ${role === 'Admin' ? 'an' : 'a'} ${role} again?`,
    };
  }

  const current = state.plushies.get(entry.subjectId);
  const photosExist = (urls: string[]) =>
    urls.every((url) => state.photos.has(url));
  const slugFree = (slug: string) =>
    [...state.plushies].every(
      ([id, plushie]) => id === entry.subjectId || plushie.slug !== slug
    );

  switch (entry.type) {
    case ActivityType.UPDATED: {
      const before = entry.before as PlushieSnapshot;
      const after = entry.after as PlushieSnapshot;
      if (!current) return null;
      const keys = changedKeys(before, after);
      if (keys.some((key) => !same(current[key], after[key]))) return null;
      const photos = [
        ...(keys.includes('thumbnail') && before.thumbnail
          ? [before.thumbnail]
          : []),
        ...(keys.includes('gallery') ? before.gallery : []),
      ];
      if (!photosExist(photos)) return null;
      if (keys.includes('slug') && !slugFree(before.slug)) return null;
      return { label: 'Revert', confirm: `Undo this change to ${name}?` };
    }
    case ActivityType.CREATED:
      if (!current || !same(current, entry.after)) return null;
      return { label: 'Undo', confirm: `Delete ${name} again?` };
    case ActivityType.DELETED: {
      const before = entry.before as PlushieSnapshot;
      if (current || !slugFree(before.slug)) return null;
      if (!photosExist(snapshotPhotos(before))) return null;
      return { label: 'Restore', confirm: `Bring ${name} back?` };
    }
    default:
      return null;
  }
}
