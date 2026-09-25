import { beforeEach, describe, expect, test } from 'bun:test';

import { addComment, deleteComment, editComment } from '@/actions/comments';
import { COMMENTS_PAGE_SIZE, getCommentList } from '@/data/dashboard';
import { ActivitySubject, ActivityType } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { COMMENTS_PER_MINUTE } from '@/lib/comment-rules';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

import {
  actAs,
  createPlushie,
  createUser,
  linkDiscord,
  type Browser,
} from './helpers';

let plushieId: string;

beforeEach(async () => {
  plushieId = (await createPlushie('Mochi')).id;
});

/** Posts as `browser`, expecting it to work, and returns the comment's id. */
async function post(browser: Browser, body: string, parentId?: string) {
  actAs(browser);
  const result = await addComment(plushieId, { body, parentId });
  if (!result.ok) throw new Error(result.error);
  return result.comment.id;
}

const find = (id: string) => db.comment.findUnique({ where: { id } });

describe('who can comment', () => {
  test('not signed out', async () => {
    actAs(null);
    expect(await addComment(plushieId, { body: 'Hi' })).toEqual({
      ok: false,
      error: 'Sign in to comment',
    });
  });

  test('only with a verified email address, or Discord', async () => {
    const { user, browser } = await createUser({
      name: 'Nova',
      verified: false,
    });
    actAs(browser);
    expect(await addComment(plushieId, { body: 'Hi' })).toEqual({
      ok: false,
      error: 'Verify your email address to comment',
    });

    // Discord has checked the account already.
    await linkDiscord(user.id);
    expect((await addComment(plushieId, { body: 'Hi' })).ok).toBe(true);
  });

  test('a few at a time', async () => {
    const { browser } = await createUser({ name: 'Rita' });
    for (let i = 0; i < COMMENTS_PER_MINUTE; i++) {
      await post(browser, `Comment ${i}`);
    }
    expect(await addComment(plushieId, { body: 'One more' })).toEqual({
      ok: false,
      error: 'That’s a lot of comments. Wait a minute.',
    });
  });
});

describe('replies', () => {
  test('belong to the thread of the top comment, however deep', async () => {
    const { browser } = await createUser({ name: 'Tom' });
    const top = await post(browser, 'Top');
    const reply = await post(browser, 'Reply', top);
    const deeper = await post(browser, 'Deeper', reply);

    expect(await find(reply)).toMatchObject({ threadId: top, parentId: top });
    expect(await find(deeper)).toMatchObject({
      threadId: top,
      parentId: reply,
    });
  });

  test("can't answer a comment on another plushie, or a deleted one", async () => {
    const { browser } = await createUser({ name: 'Tom' });
    const top = await post(browser, 'Top');
    const other = await createPlushie('Pickle');

    actAs(browser);
    expect(
      await addComment(other.id, { body: 'Wrong page', parentId: top })
    ).toEqual({ ok: false, error: 'That comment no longer exists' });

    await post(browser, 'Keeps it as [deleted]', top);
    await deleteComment(top);
    expect(
      await addComment(plushieId, { body: 'Too late', parentId: top })
    ).toEqual({ ok: false, error: 'That comment no longer exists' });
  });
});

describe('editing', () => {
  test('only your own, marked as edited once the text changes', async () => {
    const author = await createUser({ name: 'Ann' });
    const other = await createUser({ name: 'Ben' });
    const id = await post(author.browser, 'Hello');

    actAs(other.browser);
    expect(await editComment(id, { body: 'Hijacked' })).toEqual({
      ok: false,
      error: 'You can only edit your own comments',
    });

    actAs(author.browser);
    await editComment(id, { body: '  Hello  ' });
    expect((await find(id))?.editedAt).toBeNull();
    await editComment(id, { body: 'Hello there' });
    expect(await find(id)).toMatchObject({ body: 'Hello there' });
    expect((await find(id))?.editedAt).toBeInstanceOf(Date);
  });
});

describe('deleting', () => {
  test('one with replies stays as "[deleted]" until its last reply goes', async () => {
    const author = await createUser({ name: 'Ann' });
    const replier = await createUser({ name: 'Ben' });
    const top = await post(author.browser, 'Top');
    const reply = await post(replier.browser, 'Reply', top);

    actAs(author.browser);
    expect(await deleteComment(top)).toMatchObject({
      ok: true,
      removal: { placeholder: top, removed: [] },
    });
    expect(await find(top)).toMatchObject({ body: '', authorId: null });
    expect((await find(top))?.deletedAt).toBeInstanceOf(Date);

    actAs(replier.browser);
    expect(await deleteComment(reply)).toMatchObject({
      ok: true,
      removal: { removed: [reply, top] },
    });
    expect(await find(top)).toBeNull();
  });

  test("not someone else's, unless you're an editor, which is logged", async () => {
    const author = await createUser({ name: 'Ann' });
    const other = await createUser({ name: 'Ben' });
    const editor = await createUser({ name: 'Eve', role: Role.EDITOR });
    const id = await post(author.browser, 'Hello');

    actAs(other.browser);
    expect(await deleteComment(id)).toEqual({
      ok: false,
      error: 'You can only delete your own comments',
    });

    actAs(editor.browser);
    expect((await deleteComment(id)).ok).toBe(true);
    expect(await find(id)).toBeNull();
    const entry = await db.activity.findFirstOrThrow({
      where: { subject: ActivitySubject.COMMENT, subjectId: id },
    });
    expect(entry).toMatchObject({
      type: ActivityType.DELETED,
      actorId: editor.user.id,
    });
  });

  test('with all its replies, only by admins', async () => {
    const author = await createUser({ name: 'Ann' });
    const editor = await createUser({ name: 'Eve', role: Role.EDITOR });
    const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
    const top = await post(author.browser, 'Top');
    const reply = await post(author.browser, 'Reply', top);
    const deeper = await post(author.browser, 'Deeper', reply);

    actAs(editor.browser);
    expect(await deleteComment(top, { withReplies: true })).toEqual({
      ok: false,
      error: 'Only admins can delete replies with it',
    });

    actAs(admin.browser);
    const result = await deleteComment(top, { withReplies: true });
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.removal.removed.toSorted()).toEqual(
      [top, reply, deeper].toSorted()
    );
    expect(await db.comment.count()).toBe(0);
  });

  test('an account takes its comments along, keeping replies from others', async () => {
    const leaving = await createUser({ name: 'Lea' });
    const other = await createUser({ name: 'Ben' });
    const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
    // Only their own: goes completely.
    const alone = await post(leaving.browser, 'Alone');
    await post(leaving.browser, 'Talking to myself', alone);
    // Answered by someone else: stays as "[deleted]" for the answer.
    const answered = await post(leaving.browser, 'Answered');
    const answer = await post(other.browser, 'An answer', answered);

    await auth.api.removeUser({
      body: { userId: leaving.user.id },
      headers: admin.browser.headers,
    });

    expect(await find(alone)).toBeNull();
    expect(await find(answered)).toMatchObject({ body: '', authorId: null });
    expect(await find(answer)).toMatchObject({ body: 'An answer' });
    expect(await db.comment.count()).toBe(2);
  });
});

describe('the comments page', () => {
  test('lists them newest first, a page at a time, without deleted ones', async () => {
    const { user } = await createUser({ name: 'Ann' });
    const start = Date.now() - 60 * 60 * 1000;
    // Straight to the database: posting this many would hit the limit.
    const ids: string[] = [];
    for (let i = 0; i < COMMENTS_PAGE_SIZE + 5; i++) {
      const comment = await db.comment.create({
        data: {
          plushieId,
          authorId: user.id,
          body: `Comment ${i}`,
          createdAt: new Date(start + i * 1000),
        },
      });
      ids.push(comment.id);
    }
    await db.comment.update({
      where: { id: ids[0] },
      data: { deletedAt: new Date(), body: '', authorId: null },
    });

    const first = await getCommentList(null);
    expect(first.total).toBe(COMMENTS_PAGE_SIZE + 4);
    expect(first.comments[0].body).toBe(`Comment ${COMMENTS_PAGE_SIZE + 4}`);
    expect(first.comments).toHaveLength(COMMENTS_PAGE_SIZE);

    const second = await getCommentList(first.next);
    expect(second.comments.map((c) => c.body)).toEqual([
      'Comment 4',
      'Comment 3',
      'Comment 2',
      'Comment 1',
    ]);
    expect(second.next).toBeNull();
  });

  test('says whom replies answer', async () => {
    const ann = await createUser({ name: 'Ann' });
    const ben = await createUser({ name: 'Ben' });
    const top = await post(ann.browser, 'Top');
    await post(ben.browser, 'Reply', top);

    const { comments } = await getCommentList(null);
    expect(comments.map((c) => [c.body, c.replyTo, c.replies])).toEqual([
      ['Reply', { author: { id: ann.user.id, name: 'Ann' }, body: 'Top' }, 0],
      ['Top', null, 1],
    ]);
  });
});
