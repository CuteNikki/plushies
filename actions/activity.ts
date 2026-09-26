'use server';

import { revalidatePath } from 'next/cache';

import {
  ActivitySubject,
  ActivityType,
  plushieSnapshot,
  writeActivity,
  type BanSnapshot,
  type CommentSnapshot,
  type PlushieSnapshot,
  type UserSnapshot,
} from '@/lib/activity';
import { applyBan, liftBan } from '@/lib/bans';
import { restoreReplies } from '@/lib/comments';
import { db } from '@/lib/db';
import { Prisma, type Role } from '@/lib/generated/prisma/client';
import {
  canEditPlushies,
  isAdmin,
  isViewingAs,
  VIEWING_AS_MESSAGE,
} from '@/lib/permissions';
import { nextPosition } from '@/lib/plushie-order';
import { changedKeys, loadRevertState, revertOption } from '@/lib/revert';
import { getSession } from '@/lib/session';
import { fileKey } from '@/lib/uploads';

const withGallery = {
  gallery: { orderBy: { position: 'asc' } },
} satisfies Prisma.PlushieInclude;

/** The database columns for the given fields of a plushie snapshot. */
function plushieData(
  snapshot: PlushieSnapshot,
  keys: (keyof PlushieSnapshot)[]
) {
  const data: Prisma.PlushieUpdateInput = {};
  for (const key of keys) {
    switch (key) {
      case 'thumbnail':
        data.thumbnailUrl = snapshot.thumbnail;
        data.thumbnailKey = snapshot.thumbnail && fileKey(snapshot.thumbnail);
        break;
      case 'gallery':
        data.gallery = {
          deleteMany: {},
          create: snapshot.gallery.map((url, position) => ({
            key: fileKey(url),
            url,
            position,
          })),
        };
        break;
      default:
        (data as Record<string, unknown>)[key] = snapshot[key];
    }
  }
  return data;
}

/**
 * Undoes the change an activity entry recorded, if nothing changed since
 * that would be overwritten. Logs the revert as its own entry.
 */
export async function revertActivity(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!canEditPlushies(session?.user.role)) {
    return { error: 'Only editors can revert changes' };
  }
  if (isViewingAs(session)) return { error: VIEWING_AS_MESSAGE };
  const actor = { id: session.user.id, name: session.user.name };

  const entry = await db.activity.findUnique({ where: { id } });
  if (!entry) return { error: 'This entry no longer exists' };
  if (entry.subject === ActivitySubject.USER && !isAdmin(session.user.role)) {
    return { error: 'Only admins can revert account changes' };
  }
  if (!revertOption(entry, await loadRevertState())) {
    return { error: 'Something changed since, so this can’t be reverted' };
  }
  const log = {
    subject: entry.subject,
    subjectId: entry.subjectId,
    actor,
    revertOf: entry.id,
  };

  try {
    if (entry.subject === ActivitySubject.COMMENT) {
      const before = entry.before as CommentSnapshot;
      // One that showed as "[deleted]" comes back as that.
      const data = before.deleted
        ? { body: '', authorId: null, deletedAt: new Date(), editedAt: null }
        : {
            body: before.body,
            authorId: before.authorId,
            deletedAt: null,
            editedAt: null,
          };
      // Still there as "[deleted]" when it had replies; gone otherwise.
      const placeholder = await db.comment.findUnique({
        where: { id: entry.subjectId },
      });
      if (placeholder) {
        await db.comment.update({ where: { id: entry.subjectId }, data });
      } else {
        await db.comment.create({
          data: {
            ...data,
            // The same id, so its history still matches.
            id: entry.subjectId,
            plushieId: before.plushieId,
            threadId: before.threadId,
            parentId: before.parentId,
            createdAt: new Date(before.createdAt),
          },
        });
      }
      await restoreReplies(before.replies ?? []);
      // Nothing to hold a "[deleted]" one up if none of its replies came back.
      if (
        before.deleted &&
        !(await db.comment.count({ where: { parentId: entry.subjectId } }))
      ) {
        await db.comment.delete({ where: { id: entry.subjectId } });
      }
      await writeActivity({
        ...log,
        type: ActivityType.CREATED,
        subjectName: entry.subjectName,
        after: before,
      });
      return {};
    }
    if (entry.type === ActivityType.BANNED) {
      const user = await db.user.findUniqueOrThrow({
        where: { id: entry.subjectId },
      });
      await liftBan(user, actor, entry.id);
      revalidatePath('/dashboard/users', 'layout');
      return {};
    }
    if (entry.type === ActivityType.UNBANNED) {
      const user = await db.user.findUniqueOrThrow({
        where: { id: entry.subjectId },
      });
      const before = entry.before as BanSnapshot;
      await applyBan(
        user,
        {
          reason: before.reason,
          expires: before.expires ? new Date(before.expires) : null,
        },
        actor,
        entry.id
      );
      revalidatePath('/dashboard/users', 'layout');
      return {};
    }
    if (entry.subject === ActivitySubject.USER) {
      const before = entry.before as UserSnapshot;
      // Straight to the database: Better Auth's setRole would log it again.
      const user = await db.user.update({
        where: { id: entry.subjectId },
        data: { role: before.role as Role },
      });
      const now = {
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
      };
      await writeActivity({
        ...log,
        type: ActivityType.UPDATED,
        subjectName: user.name,
        before: { ...now, role: (entry.after as UserSnapshot).role },
        after: { ...now, role: user.role },
      });
      revalidatePath('/dashboard/users');
      return {};
    }

    switch (entry.type) {
      case ActivityType.UPDATED: {
        const before = entry.before as PlushieSnapshot;
        const keys = changedKeys(before, entry.after as PlushieSnapshot);
        const existing = await db.plushie.findUniqueOrThrow({
          where: { id: entry.subjectId },
          include: withGallery,
        });
        const updated = await db.plushie.update({
          where: { id: entry.subjectId },
          data: plushieData(before, keys),
          include: withGallery,
        });
        await writeActivity({
          ...log,
          type: ActivityType.UPDATED,
          subjectName: updated.name,
          before: plushieSnapshot(existing),
          after: plushieSnapshot(updated),
        });
        break;
      }
      case ActivityType.CREATED: {
        const plushie = await db.plushie.delete({
          where: { id: entry.subjectId },
          include: withGallery,
        });
        await writeActivity({
          ...log,
          type: ActivityType.DELETED,
          subjectName: plushie.name,
          before: plushieSnapshot(plushie),
        });
        break;
      }
      case ActivityType.DELETED: {
        const before = entry.before as PlushieSnapshot;
        // Everything but the gallery, which is created rather than replaced.
        const keys = (Object.keys(before) as (keyof PlushieSnapshot)[]).filter(
          (key) => key !== 'gallery'
        );
        const plushie = await db.plushie.create({
          data: {
            ...(plushieData(before, keys) as Prisma.PlushieCreateInput),
            // The same id, so its history and links still match.
            id: entry.subjectId,
            // Last in your order, outside any group.
            position: await nextPosition(db, null),
            gallery: {
              create: before.gallery.map((url, position) => ({
                key: fileKey(url),
                url,
                position,
              })),
            },
          },
          include: withGallery,
        });
        await writeActivity({
          ...log,
          type: ActivityType.CREATED,
          subjectName: plushie.name,
          after: plushieSnapshot(plushie),
        });
        break;
      }
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { error: 'Its URL name is taken by another plushie now' };
    }
    throw error;
  }

  revalidatePath('/', 'layout');
  return {};
}
