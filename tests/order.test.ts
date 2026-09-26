import { describe, expect, test } from 'bun:test';

import {
  deletePlushie,
  moveToNewGroup,
  renameGroup,
  saveOrder,
} from '@/actions/plushies';
import { getPlushies } from '@/data/plushies';
import { ActivitySubject } from '@/lib/activity';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

import { actAs, createUser, submitPlushie } from './helpers';
import { settle } from './request';

async function asEditor() {
  const editor = await createUser({ name: 'Eve', role: Role.EDITOR });
  actAs(editor.browser);
  return editor;
}

/** The names on the home page, in order. */
async function homeOrder() {
  return (await getPlushies()).map((plushie) => plushie.name);
}

async function add(name: string, extra: { group?: string } = {}) {
  expect(await submitPlushie({ name, ...extra })).toHaveProperty(
    'redirectedTo'
  );
  return db.plushie.findUniqueOrThrow({
    where: { slug: name.toLowerCase().replace(/ /g, '-') },
  });
}

describe('your order', () => {
  test('new plushies go last', async () => {
    await asEditor();
    await add('Mochi');
    await add('Bun');
    await add('Pip');
    expect(await homeOrder()).toEqual(['Mochi', 'Bun', 'Pip']);
  });

  test('a group keeps its plushies together, in its place', async () => {
    await asEditor();
    const goma = await add('Goma');
    await add('Mochi');
    // Starting a group: it takes Goma's place.
    await submitPlushie({ id: goma.id, name: 'Goma', group: 'Peach & Goma' });
    await add('Peach', { group: 'Peach & Goma' });
    // Matched ignoring case, and last in the group.
    await add('Small Goma', { group: 'peach & goma' });

    expect(await homeOrder()).toEqual(['Goma', 'Peach', 'Small Goma', 'Mochi']);
    expect(await db.plushieGroup.count()).toBe(1);
  });

  test('a copy goes right after the plushie it was copied from', async () => {
    await asEditor();
    const peach = await add('Peach', { group: 'Family' });
    await add('Goma', { group: 'Family' });
    const mochi = await add('Mochi');
    await add('Bun');

    await submitPlushie({
      name: 'Small Peach',
      group: 'Family',
      placeAfter: peach.id,
    });
    await submitPlushie({ name: 'Mochi Two', placeAfter: mochi.id });

    expect(await homeOrder()).toEqual([
      'Peach',
      'Small Peach',
      'Goma',
      'Mochi',
      'Mochi Two',
      'Bun',
    ]);
  });

  test('empty groups go away', async () => {
    await asEditor();
    const peach = await add('Peach', { group: 'Family' });
    const goma = await add('Goma', { group: 'Pair' });

    await submitPlushie({ id: peach.id, name: 'Peach' });
    await deletePlushie(goma.id);

    expect(await db.plushieGroup.count()).toBe(0);
  });

  test('only joining a group isn’t in the history', async () => {
    await asEditor();
    const mochi = await add('Mochi');
    await submitPlushie({ id: mochi.id, name: 'Mochi', group: 'Friends' });

    await settle();
    expect(
      await db.activity.count({ where: { subject: ActivitySubject.PLUSHIE } })
    ).toBe(1);
  });

  test('saving the order moves groups and plushies', async () => {
    await asEditor();
    const peach = await add('Peach', { group: 'Family' });
    const goma = await add('Goma', { group: 'Family' });
    const mochi = await add('Mochi');
    const bun = await add('Bun');
    const family = await db.plushieGroup.findFirstOrThrow();

    expect(
      await saveOrder([
        { kind: 'plushie', id: bun.id },
        {
          kind: 'group',
          id: family.id,
          // Dragged into the group.
          plushieIds: [goma.id, mochi.id],
        },
        // Dragged out of it.
        { kind: 'plushie', id: peach.id },
      ])
    ).toEqual({});

    expect(await homeOrder()).toEqual(['Bun', 'Goma', 'Mochi', 'Peach']);
    const groupOf = async (id: string) =>
      (await db.plushie.findUniqueOrThrow({ where: { id } })).groupId;
    expect(await groupOf(mochi.id)).toBe(family.id);
    expect(await groupOf(peach.id)).toBeNull();
  });

  test('dragging the last plushie out of a group removes it', async () => {
    await asEditor();
    const peach = await add('Peach', { group: 'Family' });
    const family = await db.plushieGroup.findFirstOrThrow();

    await saveOrder([
      { kind: 'group', id: family.id, plushieIds: [] },
      { kind: 'plushie', id: peach.id },
    ]);

    expect(await db.plushieGroup.count()).toBe(0);
    expect(await homeOrder()).toEqual(['Peach']);
  });

  test('a new group from the menu goes where its plushie was', async () => {
    await asEditor();
    await add('Mochi');
    const goma = await add('Goma');
    await add('Bun');
    const peach = await add('Peach', { group: 'Family' });

    expect(await moveToNewGroup(goma.id, 'Pair')).toEqual({});
    // Out of a group: the new one goes right after it.
    expect(await moveToNewGroup(peach.id, 'Peach & Co')).toEqual({});
    // A name that's taken joins that group instead.
    const bun = await db.plushie.findUniqueOrThrow({ where: { slug: 'bun' } });
    expect(await moveToNewGroup(bun.id, 'PAIR')).toEqual({});

    expect(await homeOrder()).toEqual(['Mochi', 'Goma', 'Bun', 'Peach']);
    expect(
      (await db.plushieGroup.findMany({ orderBy: { position: 'asc' } })).map(
        (group) => group.name
      )
    ).toEqual(['Pair', 'Peach & Co']);
  });

  test('only editors can save the order', async () => {
    const viewer = await createUser({ name: 'Vic' });
    actAs(viewer.browser);
    await expect(saveOrder([])).rejects.toThrow(
      'Only editors can change plushies'
    );
  });

  test('renaming a group, but not to a name another has', async () => {
    await asEditor();
    await add('Peach', { group: 'Family' });
    await add('Mochi', { group: 'Friends' });
    const family = await db.plushieGroup.findFirstOrThrow({
      where: { name: 'Family' },
    });

    expect(await renameGroup(family.id, 'FRIENDS')).toEqual({
      error: 'There’s already a group called “Friends”',
    });
    expect(await renameGroup(family.id, '  ')).toEqual({
      error: 'Give the group a name',
    });
    expect(await renameGroup(family.id, 'Peach & Co')).toEqual({});
    expect(
      (await db.plushieGroup.findUniqueOrThrow({ where: { id: family.id } }))
        .name
    ).toBe('Peach & Co');
  });
});
