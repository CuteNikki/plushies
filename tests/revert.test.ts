import { describe, expect, test } from 'bun:test';

import { revertActivity } from '@/actions/activity';
import { addComment, deleteComment } from '@/actions/comments';
import { deletePlushie } from '@/actions/plushies';
import { banUser, setUserRole } from '@/actions/users';
import { ActivityType } from '@/lib/activity';
import { isBanned } from '@/lib/bans';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

import {
  actAs,
  createPlushie,
  createUser,
  submitPlushie,
  upload,
} from './helpers';
import { settle } from './request';

/** The newest activity entry, once everything deferred has run. */
async function latestEntry() {
  await settle();
  return db.activity.findFirstOrThrow({ orderBy: { createdAt: 'desc' } });
}

async function asEditor() {
  const editor = await createUser({ name: 'Eve', role: Role.EDITOR });
  actAs(editor.browser);
  return editor;
}

describe('reverting plushie changes', () => {
  test('puts back what an edit changed, and logs the revert', async () => {
    await asEditor();
    await submitPlushie({ name: 'Mochi', species: 'Cat' });
    const { id } = await db.plushie.findUniqueOrThrow({
      where: { slug: 'mochi' },
    });
    await submitPlushie({ id, name: 'Mochi', slug: 'mochi', species: 'Bunny' });
    const edit = await latestEntry();

    expect(await revertActivity(edit.id)).toEqual({});

    expect(
      (await db.plushie.findUniqueOrThrow({ where: { id } })).species
    ).toBe('Cat');
    expect(await latestEntry()).toMatchObject({ revertOf: edit.id });
  });

  test('never overwrites a newer change', async () => {
    await asEditor();
    await submitPlushie({ name: 'Mochi', species: 'Cat' });
    const { id } = await db.plushie.findUniqueOrThrow({
      where: { slug: 'mochi' },
    });
    await submitPlushie({ id, name: 'Mochi', slug: 'mochi', species: 'Bunny' });
    const edit = await latestEntry();
    await submitPlushie({ id, name: 'Mochi', slug: 'mochi', species: 'Fox' });
    await settle();

    expect(await revertActivity(edit.id)).toEqual({
      error: 'Something changed since, so this can’t be reverted',
    });
    expect(
      (await db.plushie.findUniqueOrThrow({ where: { id } })).species
    ).toBe('Fox');
  });

  test('brings a deleted plushie back with its photos', async () => {
    await asEditor();
    const [a, b] = [upload('a', 2), upload('b', 2)];
    await submitPlushie({ name: 'Mochi', thumbnail: a, gallery: [b] });
    const { id } = await db.plushie.findUniqueOrThrow({
      where: { slug: 'mochi' },
    });
    await deletePlushie(id).catch(() => {});
    const deletion = await latestEntry();

    expect(await revertActivity(deletion.id)).toEqual({});

    const back = await db.plushie.findUniqueOrThrow({
      where: { id },
      include: { gallery: true },
    });
    expect(back.thumbnailKey).toBe('a');
    expect(back.gallery.map((photo) => photo.key)).toEqual(['b']);
  });
});

describe('reverting other changes', () => {
  test('restores a deleted comment with its replies', async () => {
    const plushie = await createPlushie('Mochi');
    const author = await createUser({ name: 'Ann' });
    actAs(author.browser);
    const top = await addComment(plushie.id, { body: 'Top' });
    if (!top.ok) throw new Error(top.error);
    await addComment(plushie.id, { body: 'Reply', parentId: top.comment.id });
    const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
    actAs(admin.browser);
    await deleteComment(top.comment.id, { withReplies: true });
    expect(await db.comment.count()).toBe(0);

    expect(await revertActivity((await latestEntry()).id)).toEqual({});

    const bodies = (await db.comment.findMany()).map((c) => c.body);
    expect(bodies.toSorted()).toEqual(['Reply', 'Top']);
  });

  test('account changes are for admins only', async () => {
    const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
    const user = await createUser({ name: 'Bea' });
    actAs(admin.browser);
    await setUserRole(user.user.id, Role.EDITOR);
    const roleChange = await latestEntry();

    await asEditor();
    expect(await revertActivity(roleChange.id)).toEqual({
      error: 'Only admins can revert account changes',
    });

    actAs(admin.browser);
    expect(await revertActivity(roleChange.id)).toEqual({});
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.user.id } })).role
    ).toBe(Role.USER);
  });

  test('reverting a ban lifts it', async () => {
    const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
    const user = await createUser({ name: 'Bea' });
    actAs(admin.browser);
    await banUser(user.user.id, { reason: 'Oops', duration: 'permanent' });
    const ban = await db.activity.findFirstOrThrow({
      where: { type: ActivityType.BANNED },
    });

    expect(await revertActivity(ban.id)).toEqual({});
    expect(
      isBanned(await db.user.findUniqueOrThrow({ where: { id: user.user.id } }))
    ).toBe(false);
  });

  test('not by accounts that can only look', async () => {
    const viewer = await createUser({ name: 'Vic' });
    await asEditor();
    await submitPlushie({ name: 'Mochi' });
    const created = await latestEntry();

    actAs(viewer.browser);
    expect(await revertActivity(created.id)).toEqual({
      error: 'Only editors can revert changes',
    });
  });
});
