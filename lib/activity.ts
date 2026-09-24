import 'server-only';

import { after } from 'next/server';

import { db } from '@/lib/db';
import {
  ActivitySubject,
  ActivityType,
  type Prisma,
} from '@/lib/generated/prisma/client';
import { isAdmin } from '@/lib/permissions';

export { ActivitySubject, ActivityType };

/** How long entries are kept. The privacy page says the same. */
export const ACTIVITY_DAYS = 90;

export function activityCutoff() {
  return new Date(Date.now() - ACTIVITY_DAYS * 24 * 60 * 60 * 1000);
}

/** Deletes entries older than ACTIVITY_DAYS. */
export async function pruneActivity() {
  await db.activity.deleteMany({
    where: { createdAt: { lt: activityCutoff() } },
  });
}

export type Actor = { id: string; name: string };

/** A plushie as the activity page compares it. Photos are their URLs. */
export type PlushieSnapshot = {
  name: string;
  slug: string;
  species: string | null;
  birthday: string | null;
  gender: string | null;
  pronouns: string | null;
  description: string;
  origin: string | null;
  traits: string[];
  facts: { label: string; value: string }[];
  thumbnail: string | null;
  gallery: string[];
};

/** A user as the activity page compares it. Never includes passwords. */
export type UserSnapshot = {
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
};

/** For LINKED and UNLINKED: which sign-in method, e.g. 'discord'. */
export type MethodSnapshot = { method: string };

/**
 * For BANNED and UNBANNED: why, if a reason was given, and when it ends
 * (ISO), or null for good.
 */
export type BanSnapshot = { reason: string | null; expires: string | null };

type Snapshot = PlushieSnapshot | UserSnapshot | MethodSnapshot | BanSnapshot;

/**
 * Records a change. The entry is written after the response is sent, so
 * logging never slows down or breaks the change itself. The returned promise
 * settles once it is written, for work that has to come after it.
 */
export function logActivity(entry: {
  type: ActivityType;
  subject: ActivitySubject;
  subjectId: string;
  subjectName: string;
  actor: Actor | null;
  before?: Snapshot;
  after?: Snapshot;
  /** For reverts: the entry whose change this undoes. */
  revertOf?: string;
}): Promise<void> {
  // e.g. a plushie saved without changes.
  if (entry.type === ActivityType.UPDATED && same(entry.before, entry.after)) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    after(async () => {
      await writeActivity(entry);
      resolve();
    });
  });
}

type ActivityEntryInput = Parameters<typeof logActivity>[0];

/**
 * Writes an entry right away, for when the page shown next must include it.
 * Errors are logged, not thrown: the change itself already went through.
 */
export async function writeActivity(entry: ActivityEntryInput) {
  try {
    await db.activity.create({
      data: {
        type: entry.type,
        subject: entry.subject,
        subjectId: entry.subjectId,
        subjectName: entry.subjectName,
        actorId: entry.actor?.id,
        actorName: entry.actor?.name,
        before: entry.before as Prisma.InputJsonValue | undefined,
        after: entry.after as Prisma.InputJsonValue | undefined,
        revertOf: entry.revertOf,
      },
    });
    await pruneActivity();
  } catch (error) {
    console.error('Failed to log activity', error);
  }
}

export function plushieSnapshot(row: {
  name: string;
  slug: string;
  species: string | null;
  birthday: string | null;
  gender: string | null;
  pronouns: string | null;
  description: string;
  origin: string | null;
  traits: string[];
  facts: Prisma.JsonValue;
  thumbnailUrl: string | null;
  gallery: { url: string }[];
}): PlushieSnapshot {
  return {
    name: row.name,
    slug: row.slug,
    species: row.species,
    birthday: row.birthday,
    gender: row.gender,
    pronouns: row.pronouns,
    description: row.description,
    origin: row.origin,
    traits: row.traits,
    facts: (row.facts ?? []) as PlushieSnapshot['facts'],
    thumbnail: row.thumbnailUrl,
    gallery: row.gallery.map((image) => image.url),
  };
}

/** The photo URLs in a plushie snapshot: the thumbnail and the gallery. */
export function snapshotPhotos(snapshot: unknown): string[] {
  const plushie = snapshot as Partial<PlushieSnapshot> | null;
  if (!plushie) return [];
  return [
    ...(plushie.thumbnail ? [plushie.thumbnail] : []),
    ...(plushie.gallery ?? []),
  ];
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  emailVerified: true,
  role: true,
} satisfies Prisma.UserSelect;

type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>;

function userSnapshot(user: UserRow): UserSnapshot {
  return {
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
  };
}

/**
 * Whether two snapshots or values are equal. Key order is ignored: the
 * database doesn't keep it.
 */
export function same(a: unknown, b: unknown) {
  return stableJson(a) === stableJson(b);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

/**
 * Who is changing the account `subject`. Only admins can change other
 * people's accounts, so anyone else, or no one signed in (e.g. an email
 * link), means the account's owner did it.
 */
async function accountActor(subject: Actor): Promise<Actor> {
  // Imported here: the session module imports auth, which imports this one.
  const { getSession } = await import('@/lib/session');
  const user = await getSession()
    .then((session) => session?.user)
    .catch(() => undefined);
  if (!user || (user.id !== subject.id && !isAdmin(user.role))) {
    return subject;
  }
  return { id: user.id, name: user.name };
}

/**
 * Logs the account changes Better Auth makes, whether someone changed their
 * own account, an admin did, or an email link did. Wraps the Prisma client
 * Better Auth writes through, since only here the old state is known.
 */
export function withAccountActivity(client: typeof db) {
  async function logUpdates(before: UserRow[]) {
    if (before.length === 0) return;
    const after = await client.user.findMany({
      where: { id: { in: before.map((user) => user.id) } },
      select: userSelect,
    });
    for (const old of before) {
      const now = after.find((user) => user.id === old.id);
      if (!now || same(userSnapshot(old), userSnapshot(now))) continue;
      logActivity({
        type: ActivityType.UPDATED,
        subject: ActivitySubject.USER,
        subjectId: now.id,
        subjectName: now.name,
        actor: await accountActor(now),
        before: userSnapshot(old),
        after: userSnapshot(now),
      });
    }
  }

  async function logDeletes(before: UserRow[]) {
    for (const old of before) {
      logActivity({
        type: ActivityType.DELETED,
        subject: ActivitySubject.USER,
        subjectId: old.id,
        subjectName: old.name,
        actor: await accountActor(old),
        before: userSnapshot(old),
      });
    }
  }

  function usersWhere(where: Prisma.UserWhereInput | undefined) {
    return client.user.findMany({ where, select: userSelect });
  }

  async function logPasswordChange(args: {
    where?: Prisma.AccountWhereInput;
    data: { password?: unknown };
  }) {
    if (typeof args.data.password !== 'string') return;
    const account = await client.account.findFirst({
      where: args.where,
      select: { user: { select: { id: true, name: true } } },
    });
    if (!account) return;
    logActivity({
      type: ActivityType.PASSWORD_CHANGED,
      subject: ActivitySubject.USER,
      subjectId: account.user.id,
      subjectName: account.user.name,
      actor: await accountActor(account.user),
    });
  }

  return client.$extends({
    query: {
      user: {
        async create({ args, query }) {
          const result = await query(args);
          const user = await client.user.findUnique({
            where: { id: (result as { id: string }).id },
            select: userSelect,
          });
          if (user) {
            logActivity({
              type: ActivityType.CREATED,
              subject: ActivitySubject.USER,
              subjectId: user.id,
              subjectName: user.name,
              actor: { id: user.id, name: user.name },
              after: userSnapshot(user),
            });
          }
          return result;
        },
        async update({ args, query }) {
          const before = await usersWhere(args.where);
          const result = await query(args);
          await logUpdates(before);
          return result;
        },
        async updateMany({ args, query }) {
          const before = await usersWhere(args.where);
          const result = await query(args);
          await logUpdates(before);
          return result;
        },
        async delete({ args, query }) {
          const before = await usersWhere(args.where);
          const result = await query(args);
          await logDeletes(before);
          return result;
        },
        async deleteMany({ args, query }) {
          const before = await usersWhere(args.where);
          const result = await query(args);
          await logDeletes(before);
          return result;
        },
      },
      account: {
        async create({ args, query }) {
          const userId = (args.data as { userId: string }).userId;
          // An account's first sign-in method comes with signing up, which is
          // logged already.
          const existing = await client.account.count({ where: { userId } });
          const result = await query(args);
          const user = await client.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true },
          });
          if (existing > 0 && user) {
            logActivity({
              type: ActivityType.LINKED,
              subject: ActivitySubject.USER,
              subjectId: user.id,
              subjectName: user.name,
              actor: await accountActor(user),
              after: {
                method: (args.data as { providerId: string }).providerId,
              },
            });
          }
          return result;
        },
        // Changing and resetting a password use updateMany, by user id.
        async update({ args, query }) {
          const result = await query(args);
          await logPasswordChange(args);
          return result;
        },
        async updateMany({ args, query }) {
          const result = await query(args);
          await logPasswordChange(args);
          return result;
        },
        // Unlinking deletes one account by id. Deleting a user removes all of
        // them with deleteMany, which the user's own entry covers.
        async delete({ args, query }) {
          const account = await client.account.findFirst({
            where: args.where,
            select: {
              providerId: true,
              user: { select: { id: true, name: true } },
            },
          });
          const result = await query(args);
          if (account) {
            logActivity({
              type: ActivityType.UNLINKED,
              subject: ActivitySubject.USER,
              subjectId: account.user.id,
              subjectName: account.user.name,
              actor: await accountActor(account.user),
              before: { method: account.providerId },
            });
          }
          return result;
        },
      },
    },
  });
}
