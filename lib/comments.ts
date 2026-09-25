import 'server-only';

import type { CommentSnapshot } from '@/lib/activity';
import type { Session } from '@/lib/auth';
import {
  COMMENTS_PER_PAGE,
  type CommentsPage,
  type CommentView,
  type CommentViewer,
} from '@/lib/comment-rules';
import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { canEditPlushies, isAdmin, isViewingAs } from '@/lib/permissions';

const viewInclude = {
  author: { select: { id: true, name: true, image: true, role: true } },
} satisfies Prisma.CommentInclude;

type CommentRow = Prisma.CommentGetPayload<{ include: typeof viewInclude }>;

/** One comment for the page, without its replies. */
export function toView(row: CommentRow): CommentView {
  return {
    id: row.id,
    body: row.deletedAt ? '' : row.body,
    author: row.deletedAt ? null : row.author,
    createdAt: row.createdAt.toISOString(),
    editedAt: row.editedAt?.toISOString() ?? null,
    deleted: !!row.deletedAt,
    replies: [],
  };
}

/** Loads a comment for the page, e.g. right after it was written. */
export async function getCommentView(id: string) {
  const row = await db.comment.findUniqueOrThrow({
    where: { id },
    include: viewInclude,
  });
  return toView(row);
}

/**
 * Whether an account may write comments: a confirmed email address, or a
 * Discord account, which Discord has verified already.
 */
export async function isVerified(user: { id: string; emailVerified: boolean }) {
  if (user.emailVerified) return true;
  const discord = await db.account.count({
    where: { userId: user.id, providerId: 'discord' },
  });
  return discord > 0;
}

export async function commentViewer(
  session: Session | null
): Promise<CommentViewer> {
  if (!session) {
    return {
      id: null,
      blocked: 'signed-out',
      canModerate: false,
      canPurge: false,
    };
  }
  const viewingAs = isViewingAs(session);
  return {
    id: session.user.id,
    blocked: viewingAs
      ? 'viewing-as'
      : (await isVerified(session.user))
        ? null
        : 'unverified',
    canModerate: !viewingAs && canEditPlushies(session.user.role),
    canPurge: !viewingAs && isAdmin(session.user.role),
  };
}

/**
 * One page of a plushie's comments: top-level ones newest first, each with
 * its whole thread nested under it, replies oldest first.
 */
export async function getComments(
  plushieId: string,
  cursor: string | null,
  session: Session | null,
  /** A comment to reach: the first page goes on down to its thread. */
  focus: string | null = null
): Promise<CommentsPage> {
  const size =
    focus && !cursor
      ? Math.max(COMMENTS_PER_PAGE, await threadsUpTo(plushieId, focus))
      : COMMENTS_PER_PAGE;
  const [rows, total, viewer] = await Promise.all([
    db.comment.findMany({
      where: { plushieId, threadId: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: size + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: viewInclude,
    }),
    db.comment.count({ where: { plushieId, deletedAt: null } }),
    commentViewer(session),
  ]);
  const page = rows.slice(0, size);

  const replies = await db.comment.findMany({
    where: { threadId: { in: page.map((row) => row.id) } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: viewInclude,
  });
  // Oldest first, so every parent is placed before its replies.
  const views = new Map<string, CommentView>();
  const threads = page.map((row) => {
    const view = toView(row);
    views.set(row.id, view);
    return view;
  });
  for (const row of replies) {
    const view = toView(row);
    views.set(row.id, view);
    views.get(row.parentId!)?.replies.push(view);
  }

  return {
    threads,
    nextCursor: rows.length > size ? page.at(-1)!.id : null,
    total,
    viewer,
  };
}

/**
 * How many threads, newest first, it takes to get to the one this comment
 * is in, that one included. 0 if it isn't on this plushie anymore.
 */
async function threadsUpTo(plushieId: string, commentId: string) {
  const comment = await db.comment.findFirst({
    where: { id: commentId, plushieId },
    select: { threadId: true },
  });
  const thread =
    comment &&
    (await db.comment.findUnique({
      where: { id: comment.threadId ?? commentId },
      select: { id: true, createdAt: true },
    }));
  if (!thread) return 0;
  // The same order as the page: newest first, then by id.
  return db.comment.count({
    where: {
      plushieId,
      threadId: null,
      OR: [
        { createdAt: { gt: thread.createdAt } },
        { createdAt: thread.createdAt, id: { gte: thread.id } },
      ],
    },
  });
}

export function commentSnapshot(comment: {
  body: string;
  plushieId: string;
  plushie: { name: string };
  authorId: string | null;
  author: { name: string } | null;
  threadId: string | null;
  parentId: string | null;
  createdAt: Date;
}): CommentSnapshot {
  return {
    body: comment.body,
    plushieId: comment.plushieId,
    plushieName: comment.plushie.name,
    authorId: comment.authorId,
    authorName: comment.author?.name ?? null,
    threadId: comment.threadId,
    parentId: comment.parentId,
    createdAt: comment.createdAt.toISOString(),
  };
}

/**
 * What happened to a deleted comment. One with replies stays as "[deleted]"
 * so its replies keep their place; anything else goes, and so do "[deleted]"
 * comments above it that are left without replies.
 */
export type Removal = {
  removed: string[];
  /** The comment left as "[deleted]", if any. */
  placeholder: string | null;
  /** How many comments that showed are gone, for the count on the page. */
  counted: number;
};

/**
 * Deletes a comment the way the site does everywhere: by its author, by an
 * editor or admin, or along with the author's account.
 */
export async function removeComment(
  client: Pick<typeof db, 'comment'>,
  comment: { id: string; parentId: string | null }
): Promise<Removal> {
  const replies = await client.comment.count({
    where: { parentId: comment.id },
  });
  if (replies > 0) {
    await client.comment.update({
      where: { id: comment.id },
      data: { body: '', authorId: null, editedAt: null, deletedAt: new Date() },
    });
    return { removed: [], placeholder: comment.id, counted: 1 };
  }

  await client.comment.delete({ where: { id: comment.id } });
  const removed = [
    comment.id,
    ...(await removeEmptyAbove(client, comment.parentId)),
  ];
  return { removed, placeholder: null, counted: 1 };
}

/**
 * Deletes a comment together with every reply under it, however deep, for
 * admins: nothing of it stays on the page, not even "[deleted]". Returns what went,
 * with snapshots of the replies so the activity log can bring them back.
 */
export async function removeBranch(comment: {
  id: string;
  threadId: string | null;
  parentId: string | null;
  deletedAt: Date | null;
}) {
  // The whole thread, to find the replies under this comment.
  const thread = await db.comment.findMany({
    where: {
      OR: [
        { id: comment.threadId ?? comment.id },
        { threadId: comment.threadId ?? comment.id },
      ],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: {
      plushie: { select: { name: true } },
      author: { select: { name: true } },
    },
  });
  const inBranch = new Set([comment.id]);
  // Oldest first, so every parent is seen before its replies.
  const replies = thread.filter((row) => {
    if (!row.parentId || !inBranch.has(row.parentId)) return false;
    inBranch.add(row.id);
    return true;
  });

  // Replies go along through the database's cascade.
  await db.comment.delete({ where: { id: comment.id } });
  const removal: Removal = {
    removed: [
      comment.id,
      ...replies.map((reply) => reply.id),
      ...(await removeEmptyAbove(db, comment.parentId)),
    ],
    placeholder: null,
    // "[deleted]" ones weren't counted on the page.
    counted: [comment, ...replies].filter((row) => !row.deletedAt).length,
  };
  return {
    removal,
    replies: replies.map((reply) => ({
      ...commentSnapshot(reply),
      id: reply.id,
      deleted: !!reply.deletedAt,
    })),
  };
}

/**
 * Brings back the replies an editor or admin deleted with a comment, after
 * the comment itself is back. Replies whose author's account is gone can't
 * come back as theirs: they return as "[deleted]" if replies under them do,
 * and not at all otherwise.
 */
export async function restoreReplies(
  replies: NonNullable<CommentSnapshot['replies']>
) {
  if (replies.length === 0) return;
  const authorIds = replies.flatMap((reply) =>
    reply.authorId ? [reply.authorId] : []
  );
  const authors = new Set(
    (
      await db.user.findMany({
        where: { id: { in: authorIds } },
        select: { id: true },
      })
    ).map((user) => user.id)
  );

  // Newest first, so replies are decided on before what they answer.
  const keep = new Map<string, 'whole' | 'deleted'>();
  for (const reply of [...replies].reverse()) {
    if (!reply.deleted && reply.authorId && authors.has(reply.authorId)) {
      keep.set(reply.id, 'whole');
    } else if (replies.some((r) => r.parentId === reply.id && keep.has(r.id))) {
      keep.set(reply.id, 'deleted');
    }
  }

  // Oldest first, so every parent exists before its replies.
  await db.$transaction(
    replies
      .filter((reply) => keep.has(reply.id))
      .map((reply) => {
        const whole = keep.get(reply.id) === 'whole';
        return db.comment.create({
          data: {
            id: reply.id,
            plushieId: reply.plushieId,
            threadId: reply.threadId,
            parentId: reply.parentId,
            authorId: whole ? reply.authorId : null,
            body: whole ? reply.body : '',
            deletedAt: whole ? null : new Date(),
            createdAt: new Date(reply.createdAt),
          },
        });
      })
  );
}

/**
 * Removes "[deleted]" comments above `parentId` that have nothing left under
 * them, and returns their ids.
 */
async function removeEmptyAbove(
  client: Pick<typeof db, 'comment'>,
  parentId: string | null
) {
  const removed: string[] = [];
  while (parentId) {
    const parent = await client.comment.findUnique({
      where: { id: parentId },
      select: {
        parentId: true,
        deletedAt: true,
        _count: { select: { replies: true } },
      },
    });
    if (!parent?.deletedAt || parent._count.replies > 0) break;
    await client.comment.delete({ where: { id: parentId } });
    removed.push(parentId);
    parentId = parent.parentId;
  }
  return removed;
}

/**
 * Removes the comments of the accounts `where` matches, right before they
 * are deleted. Newest first, so replies go before what they answer, and a
 * thread of only their own comments goes completely rather than staying as
 * "[deleted]".
 */
export async function removeCommentsOf(where: Prisma.UserWhereInput) {
  const comments = await db.comment.findMany({
    where: { author: where },
    select: { id: true, parentId: true },
    orderBy: { createdAt: 'desc' },
  });
  for (const comment of comments) {
    // An earlier removal may have taken this one along already.
    const exists = await db.comment.count({ where: { id: comment.id } });
    if (exists) await removeComment(db, comment);
  }
}
