import { describe, expect, test } from 'bun:test';

import { banUser, unbanUser } from '@/actions/users';
import { ActivityType } from '@/lib/activity';
import { isBanned } from '@/lib/bans';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

import { actAs, Browser, createUser, sessionOf, signIn } from './helpers';

/** An admin, acting, and someone for them to ban. */
async function adminAndUser() {
  const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
  const user = await createUser({ name: 'Bea' });
  actAs(admin.browser);
  return { admin, user };
}

describe('isBanned', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  const at = (iso: string) => new Date(iso);

  test('a ban without an end is in force', () => {
    expect(isBanned({ banned: true, banExpires: null }, now)).toBe(true);
  });

  test('a ban that ends later is in force', () => {
    const banExpires = at('2026-06-02T00:00:00Z');
    expect(isBanned({ banned: true, banExpires }, now)).toBe(true);
  });

  test('a ban that has ended is not, even with the flag still set', () => {
    const banExpires = at('2026-06-01T11:59:59Z');
    expect(isBanned({ banned: true, banExpires }, now)).toBe(false);
  });

  test('no ban is no ban', () => {
    expect(isBanned({ banned: false, banExpires: null }, now)).toBe(false);
    expect(isBanned({ banned: null, banExpires: null }, now)).toBe(false);
  });
});

describe('banning', () => {
  test('signs them out everywhere and refuses their sign-in, saying why', async () => {
    const { user } = await adminAndUser();

    expect(
      await banUser(user.user.id, { reason: 'Spam', duration: 'permanent' })
    ).toEqual({});
    expect(await sessionOf(user.browser)).toBeNull();

    const browser = new Browser();
    const { status, body } = await signIn(browser, user.user.email);
    expect(status).toBe(403);
    expect(body.code).toBe('BANNED_USER');
    // Lets /banned show the reason to them, and only them.
    expect(browser.has('ban_notice')).toBe(true);
    expect(await sessionOf(browser)).toBeNull();
  });

  test('records who banned them, until when, and logs it', async () => {
    const { admin, user } = await adminAndUser();
    const before = Date.now();

    await banUser(user.user.id, { reason: '', duration: '7' });

    const banned = await db.user.findUniqueOrThrow({
      where: { id: user.user.id },
    });
    expect(banned.bannedById).toBe(admin.user.id);
    expect(banned.banReason).toBeNull();
    const week = 7 * 24 * 60 * 60 * 1000;
    expect(banned.banExpires!.getTime()).toBeGreaterThanOrEqual(before + week);
    expect(banned.banExpires!.getTime()).toBeLessThan(before + week + 60_000);

    const entry = await db.activity.findFirstOrThrow({
      where: { type: ActivityType.BANNED, subjectId: user.user.id },
    });
    expect(entry.actorId).toBe(admin.user.id);
  });

  test('once a ban has ended they can sign in, and it is cleared', async () => {
    const { user } = await adminAndUser();
    await banUser(user.user.id, { reason: 'Cool off', duration: '1' });
    await db.user.update({
      where: { id: user.user.id },
      data: { banExpires: new Date(Date.now() - 1000) },
    });

    const browser = new Browser();
    expect((await signIn(browser, user.user.email)).status).toBe(200);
    expect((await sessionOf(browser))?.user.id).toBe(user.user.id);
    const after = await db.user.findUniqueOrThrow({
      where: { id: user.user.id },
    });
    expect(after.banned).toBe(false);
    expect(after.bannedById).toBeNull();
    expect(after.bannedAt).toBeNull();
  });

  test('lifting a ban lets them sign in again', async () => {
    const { user } = await adminAndUser();
    await banUser(user.user.id, { reason: '', duration: 'permanent' });

    expect(await unbanUser(user.user.id)).toEqual({});
    expect((await signIn(new Browser(), user.user.email)).status).toBe(200);
    expect(await unbanUser(user.user.id)).toEqual({
      error: 'They aren’t banned anymore',
    });
  });

  test('only admins can ban, and not themselves', async () => {
    const editor = await createUser({ name: 'Eddie', role: Role.EDITOR });
    const { admin, user } = await adminAndUser();

    actAs(editor.browser);
    await expect(
      banUser(user.user.id, { reason: '', duration: '1' })
    ).rejects.toThrow('Only admins can do that');

    actAs(admin.browser);
    await expect(
      banUser(admin.user.id, { reason: '', duration: '1' })
    ).rejects.toThrow("You can't do that to your own account");
  });

  test("admins can't be banned", async () => {
    const { admin } = await adminAndUser();
    const other = await createUser({ name: 'Otto', role: Role.ADMIN });

    actAs(admin.browser);
    expect(await banUser(other.user.id, { reason: '', duration: '1' })).toEqual(
      { error: "Admins can't be banned" }
    );
  });

  test('refuses durations and reasons the form never sends', async () => {
    const { user } = await adminAndUser();
    expect(await banUser(user.user.id, { reason: '', duration: '2' })).toEqual({
      error: 'Pick how long',
    });
    expect(
      await banUser(user.user.id, { reason: 'x'.repeat(501), duration: '1' })
    ).toEqual({ error: 'Keep the reason under 500 characters' });
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.user.id } })).banned
    ).toBe(false);
  });
});
