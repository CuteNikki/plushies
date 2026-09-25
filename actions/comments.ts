'use server';

import {
  ActivitySubject,
  ActivityType,
  writeActivity,
  type CommentSnapshot,
} from '@/lib/activity';
import type { Session } from '@/lib/auth';
import {
  commentError,
  COMMENTS_PER_MINUTE,
  type CommentView,
} from '@/lib/comment-rules';
import {
  commentSnapshot,
  commentViewer,
  getCommentView,
  removeBranch,
  removeComment,
  type Removal,
} from '@/lib/comments';
import { db } from '@/lib/db';
import { VIEWING_AS_MESSAGE } from '@/lib/permissions';
import { getSession } from '@/lib/session';

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const blockedMessages = {
  'signed-out': 'Sign in to comment',
  unverified: 'Verify your email address to comment',
  'viewing-as': VIEWING_AS_MESSAGE,
};

/** Who is writing, if they may write comments at all. */
async function writer(): Promise<
  { ok: true; session: Session } | { ok: false; error: string }
> {
  const session = await getSession();
  const viewer = await commentViewer(session);
  if (!session || viewer.blocked) {
    return {
      ok: false,
      error: blockedMessages[viewer.blocked ?? 'signed-out'],
    };
  }
  return { ok: true, session };
}

/**
 * Posts a comment on a plushie, or a reply to the comment `parentId`, at
 * any depth.
 */
export async function addComment(
  plushieId: string,
  input: { body: string; parentId?: string }
): Promise<Result<{ comment: CommentView }>> {
  const who = await writer();
  if (!who.ok) return who;
  const body = input.body.trim();
  const problem = commentError(body);
  if (problem) return { ok: false, error: problem };

  const recent = await db.comment.count({
    where: {
      authorId: who.session.user.id,
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
  });
  if (recent >= COMMENTS_PER_MINUTE) {
    // Not saying for how long, so spam can't be timed to it.
    return { ok: false, error: 'That’s a lot of comments. Try again later.' };
  }

  let threadId: string | null = null;
  if (input.parentId) {
    const parent = await db.comment.findUnique({
      where: { id: input.parentId },
      select: { plushieId: true, threadId: true, deletedAt: true },
    });
    if (!parent || parent.plushieId !== plushieId || parent.deletedAt) {
      return { ok: false, error: 'That comment no longer exists' };
    }
    threadId = parent.threadId ?? input.parentId;
  } else {
    const plushie = await db.plushie.count({ where: { id: plushieId } });
    if (!plushie) return { ok: false, error: 'This plushie no longer exists' };
  }

  const comment = await db.comment.create({
    data: {
      plushieId,
      authorId: who.session.user.id,
      body,
      threadId,
      parentId: input.parentId ?? null,
    },
  });
  return { ok: true, comment: await getCommentView(comment.id) };
}

/** Changes the text of your own comment. It's marked as edited. */
export async function editComment(
  id: string,
  input: { body: string }
): Promise<Result<{ comment: CommentView }>> {
  const who = await writer();
  if (!who.ok) return who;
  const body = input.body.trim();
  const problem = commentError(body);
  if (problem) return { ok: false, error: problem };

  const comment = await db.comment.findUnique({ where: { id } });
  if (!comment || comment.deletedAt) {
    return { ok: false, error: 'That comment no longer exists' };
  }
  if (comment.authorId !== who.session.user.id) {
    return { ok: false, error: 'You can only edit your own comments' };
  }
  if (comment.body !== body) {
    await db.comment.update({
      where: { id },
      data: { body, editedAt: new Date() },
    });
  }
  return { ok: true, comment: await getCommentView(id) };
}

/**
 * Deletes a comment: your own, or anyone's for editors and admins. When
 * editors and admins delete one, every reply under it goes too, and nothing
 * stays on the page; that's logged, so it can be restored.
 */
export async function deleteComment(
  id: string,
  options: { withReplies?: boolean } = {}
): Promise<Result<{ removal: Removal }>> {
  const session = await getSession();
  const viewer = await commentViewer(session);
  if (!session || viewer.blocked === 'viewing-as') {
    return {
      ok: false,
      error: session ? VIEWING_AS_MESSAGE : 'Sign in to delete comments',
    };
  }

  const comment = await db.comment.findUnique({
    where: { id },
    include: {
      plushie: { select: { name: true } },
      author: { select: { name: true } },
    },
  });
  // Only admins can clear out "[deleted]" comments, along with their replies.
  if (!comment || (comment.deletedAt && !options.withReplies)) {
    return { ok: false, error: 'That comment no longer exists' };
  }
  if (options.withReplies && !viewer.canPurge) {
    return { ok: false, error: 'Only admins can delete replies with it' };
  }
  const own = !!comment.authorId && comment.authorId === session.user.id;
  if (!own && !viewer.canModerate) {
    return { ok: false, error: 'You can only delete your own comments' };
  }
  const log = (replies?: NonNullable<CommentSnapshot['replies']>) =>
    writeActivity({
      type: ActivityType.DELETED,
      subject: ActivitySubject.COMMENT,
      subjectId: comment.id,
      subjectName: comment.author?.name ?? 'Someone',
      actor: { id: session.user.id, name: session.user.name },
      before: {
        ...commentSnapshot(comment),
        deleted: !!comment.deletedAt,
        replies,
      },
    });

  if (options.withReplies) {
    const { removal, replies } = await removeBranch(comment);
    // Their own comment on its own is like anyone deleting theirs.
    if (!own || replies.length > 0) await log(replies);
    return { ok: true, removal };
  }

  const removal = await removeComment(db, comment);
  if (!own) await log();
  return { ok: true, removal };
}
