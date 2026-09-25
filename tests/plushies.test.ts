import { describe, expect, test } from 'bun:test';

import { deletePlushie, discardUploads } from '@/actions/plushies';
import { getPlushieList } from '@/data/dashboard';
import { ActivitySubject, ActivityType } from '@/lib/activity';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

import {
  actAs,
  createPlushie,
  createUser,
  submitPlushie,
  upload,
} from './helpers';
import { settle, uploads } from './request';

async function asEditor() {
  const editor = await createUser({ name: 'Eve', role: Role.EDITOR });
  actAs(editor.browser);
  return editor;
}

const plushieBySlug = (slug: string) =>
  db.plushie.findUnique({
    where: { slug },
    include: { gallery: { orderBy: { position: 'asc' } } },
  });

describe('saving a plushie', () => {
  test('only editors can', async () => {
    const viewer = await createUser({ name: 'Vic' });
    actAs(viewer.browser);
    await expect(submitPlushie({ name: 'Mochi' })).rejects.toThrow(
      'Only editors can change plushies'
    );
    expect(await db.plushie.count()).toBe(0);
  });

  test('makes its URL name from its name, and logs it', async () => {
    const editor = await asEditor();

    expect(await submitPlushie({ name: 'Blåhaj Jr.' })).toEqual({
      redirectedTo: '/plushies/blahaj-jr',
    });
    const plushie = await plushieBySlug('blahaj-jr');
    expect(plushie?.name).toBe('Blåhaj Jr.');

    await settle();
    const entry = await db.activity.findFirstOrThrow({
      where: { subject: ActivitySubject.PLUSHIE, subjectId: plushie!.id },
    });
    expect(entry).toMatchObject({
      type: ActivityType.CREATED,
      actorId: editor.user.id,
    });
  });

  test('checks what the form sends', async () => {
    await asEditor();
    const cases: [Parameters<typeof submitPlushie>[0], string][] = [
      [{ name: '  ' }, 'Give your plushie a name'],
      [{ name: 'Mochi', description: ' ' }, 'Write a little description'],
      [
        { name: 'Mochi', slug: 'Mochi Mochi!' },
        'The URL name can only use a-z, 0-9 and dashes',
      ],
      [
        { name: 'Mochi', birthday: '2023-02-30' },
        "That birthday isn't a real date",
      ],
      [
        { name: 'Mochi', birthday: '2999' },
        "The birthday can't be in the future",
      ],
      [
        {
          name: 'Mochi',
          thumbnail: { key: 'x', url: 'https://example.com/f/x' },
        },
        'Photos must be uploaded through the form',
      ],
    ];
    for (const [fields, error] of cases) {
      expect(await submitPlushie(fields)).toEqual({ error });
    }
    expect(await db.plushie.count()).toBe(0);
  });

  test('refuses a URL name another plushie has', async () => {
    await asEditor();
    await createPlushie('Mochi');
    expect(await submitPlushie({ name: 'Other', slug: 'mochi' })).toEqual({
      error: 'Another plushie already uses the URL name "mochi"',
    });
  });

  test('editing keeps the gallery in its new order', async () => {
    await asEditor();
    const [a, b, c] = ['a', 'b', 'c'].map((key) => upload(key));
    await submitPlushie({ name: 'Mochi', thumbnail: a, gallery: [b, c] });
    const { id } = (await plushieBySlug('mochi'))!;

    await submitPlushie({ id, name: 'Mochi', thumbnail: c, gallery: [b, a] });

    const saved = await plushieBySlug('mochi');
    expect(saved?.thumbnailKey).toBe('c');
    expect(saved?.gallery.map((photo) => photo.key)).toEqual(['b', 'a']);
  });
});

describe('photos', () => {
  test('discarding uploads deletes only ones nothing uses', async () => {
    await asEditor();
    const [thumb, inGallery, removed] = ['thumb', 'in-gallery', 'removed'].map(
      (key) => upload(key)
    );
    upload('never-saved');
    await submitPlushie({
      name: 'Mochi',
      thumbnail: thumb,
      gallery: [inGallery, removed],
    });
    const { id } = (await plushieBySlug('mochi'))!;
    // Removed from the plushie, but the change can still be reverted.
    await submitPlushie({
      id,
      name: 'Mochi',
      thumbnail: thumb,
      gallery: [inGallery],
    });
    await settle();

    await discardUploads(['thumb', 'in-gallery', 'removed', 'never-saved']);

    expect([...uploads.keys()].toSorted()).toEqual([
      'in-gallery',
      'removed',
      'thumb',
    ]);
  });

  test('saving cleans up old leftovers, not fresh uploads', async () => {
    await asEditor();
    // Maybe still in a form someone has open.
    upload('fresh');
    upload('old-leftover', 2);
    const photo = upload('photo', 2);

    await submitPlushie({ name: 'Mochi', thumbnail: photo });
    await settle();

    expect([...uploads.keys()].toSorted()).toEqual(['fresh', 'photo']);
  });

  test('deleting a plushie keeps its photos, so it can be restored', async () => {
    await asEditor();
    const photo = upload('photo', 2);
    await submitPlushie({ name: 'Mochi', thumbnail: photo });
    const { id } = (await plushieBySlug('mochi'))!;

    await expect(deletePlushie(id)).rejects.toThrow(
      'Redirected to /dashboard/plushies'
    );
    await settle();

    expect(await plushieBySlug('mochi')).toBeNull();
    expect(uploads.has('photo')).toBe(true);
  });
});

describe('the plushie list', () => {
  test('counts comments, but not "[deleted]" ones', async () => {
    const { user } = await createUser({ name: 'Ann' });
    const mochi = await createPlushie('Mochi');
    await createPlushie('Pickle');
    for (const deletedAt of [null, null, new Date()]) {
      await db.comment.create({
        data: {
          plushieId: mochi.id,
          authorId: deletedAt ? null : user.id,
          body: deletedAt ? '' : 'Hi',
          deletedAt,
        },
      });
    }

    const counts = (await getPlushieList()).map((p) => [p.name, p.comments]);
    expect(counts).toEqual([
      ['Mochi', 2],
      ['Pickle', 0],
    ]);
  });
});
