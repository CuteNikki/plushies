import { describe, expect, test } from 'bun:test';

import { ACTIVITY_PAGE_SIZE, getActivity } from '@/data/activity';
import { ActivitySubject, ActivityType } from '@/lib/activity';
import { db } from '@/lib/db';

/** Log entries about plushies, `count` of them, all at the same moment. */
async function entries(
  count: number,
  subject: ActivitySubject = ActivitySubject.PLUSHIE
) {
  const at = new Date(Date.now() - 60 * 60 * 1000);
  await db.activity.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      type: ActivityType.UPDATED,
      subject,
      subjectId: `subject-${subject}-${i}`,
      subjectName: `Entry ${i}`,
      createdAt: at,
    })),
  });
}

/** Every entry, following `next` from page to page. */
async function allPages(options: { subjects?: ActivitySubject[] } = {}) {
  const pages: string[][] = [];
  let cursor: string | null = null;
  do {
    const page: Awaited<ReturnType<typeof getActivity>> = await getActivity({
      ...options,
      admin: true,
      cursor,
    });
    pages.push(page.entries.map(({ entry }) => entry.id));
    cursor = page.next;
  } while (cursor);
  return pages;
}

describe('the activity page', () => {
  test('pages through everything once, even entries from the same moment', async () => {
    await entries(ACTIVITY_PAGE_SIZE * 2 + 5);

    const pages = await allPages();

    expect(pages.map((page) => page.length)).toEqual([
      ACTIVITY_PAGE_SIZE,
      ACTIVITY_PAGE_SIZE,
      5,
    ]);
    const ids = pages.flat();
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(await db.activity.count());
  });

  test('keeps to the filter from page to page', async () => {
    await entries(ACTIVITY_PAGE_SIZE + 3, ActivitySubject.PLUSHIE);
    await entries(ACTIVITY_PAGE_SIZE, ActivitySubject.USER);

    const pages = await allPages({ subjects: [ActivitySubject.PLUSHIE] });

    const ids = pages.flat();
    expect(ids.length).toBe(ACTIVITY_PAGE_SIZE + 3);
    const subjects = await db.activity.findMany({
      where: { id: { in: ids } },
      select: { subject: true },
    });
    expect(
      subjects.every(({ subject }) => subject === ActivitySubject.PLUSHIE)
    ).toBe(true);
  });

  test('one page needs no more', async () => {
    await entries(3);
    const page = await getActivity({ admin: true });
    expect(page.entries).toHaveLength(3);
    expect(page.next).toBeNull();
  });

  test('searches what it is about and who did it, oldest first if asked', async () => {
    const hour = 60 * 60 * 1000;
    await db.activity.createMany({
      data: [
        { name: 'Mochi', actor: 'Ann', ago: 3 },
        { name: 'Pickle', actor: 'Ben', ago: 2 },
        { name: 'Bea', actor: 'Ann', ago: 1 },
      ].map(({ name, actor, ago }) => ({
        type: ActivityType.UPDATED,
        subject: ActivitySubject.PLUSHIE,
        subjectId: name,
        subjectName: name,
        actorName: actor,
        createdAt: new Date(Date.now() - ago * hour),
      })),
    });
    const names = async (options: { q?: string; sort?: 'oldest' }) =>
      (await getActivity({ admin: true, ...options })).entries.map(
        ({ entry }) => entry.subjectName
      );

    expect(await names({ q: 'ann' })).toEqual(['Bea', 'Mochi']);
    expect(await names({ q: 'PICK' })).toEqual(['Pickle']);
    expect(await names({ sort: 'oldest' })).toEqual(['Mochi', 'Pickle', 'Bea']);
  });
});
