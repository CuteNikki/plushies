import { beforeEach, describe, expect, test } from 'bun:test';

import { addComment } from '@/actions/comments';
import { toggleLike } from '@/actions/likes';
import {
  banUser,
  resetTwoFactor,
  setUserRole,
  signOutUser,
  viewAsUser,
} from '@/actions/users';
import { ActivityType } from '@/lib/activity';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role, VIEWING_AS_MESSAGE } from '@/lib/permissions';

import {
  actAs,
  Browser,
  createPlushie,
  createUser,
  PASSWORD,
  sessionOf,
  signIn,
  submitPlushie,
} from './helpers';
import { settle } from './request';

let plushieId: string;

beforeEach(async () => {
  plushieId = (await createPlushie('Mochi')).id;
});

async function adminAndUser(role: Role = Role.USER) {
  const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
  const user = await createUser({ name: 'Bea', role });
  actAs(admin.browser);
  return { admin, user };
}

const roleOf = async (id: string) =>
  (await db.user.findUniqueOrThrow({ where: { id } })).role;

describe('likes', () => {
  test('need an account', async () => {
    actAs(null);
    expect(await toggleLike(plushieId)).toEqual({
      error: 'Sign in to like plushies',
    });
  });

  test('toggle, one per account', async () => {
    const ann = await createUser({ name: 'Ann' });
    const ben = await createUser({ name: 'Ben' });

    actAs(ann.browser);
    expect(await toggleLike(plushieId)).toEqual({ liked: true, count: 1 });
    actAs(ben.browser);
    expect(await toggleLike(plushieId)).toEqual({ liked: true, count: 2 });
    actAs(ann.browser);
    expect(await toggleLike(plushieId)).toEqual({ liked: false, count: 1 });
  });
});

describe('roles', () => {
  test('admins change them, and it is logged', async () => {
    const { admin, user } = await adminAndUser();

    expect(await setUserRole(user.user.id, Role.EDITOR)).toEqual({});
    expect(await roleOf(user.user.id)).toBe(Role.EDITOR);

    await settle();
    const entry = await db.activity.findFirstOrThrow({
      where: { type: ActivityType.UPDATED, subjectId: user.user.id },
    });
    expect(entry).toMatchObject({
      actorId: admin.user.id,
      before: expect.objectContaining({ role: Role.USER }),
      after: expect.objectContaining({ role: Role.EDITOR }),
    });
  });

  test('not by editors, and not your own', async () => {
    const { admin, user } = await adminAndUser();
    const editor = await createUser({ name: 'Eve', role: Role.EDITOR });

    actAs(editor.browser);
    await expect(setUserRole(user.user.id, Role.ADMIN)).rejects.toThrow(
      'Only admins can do that'
    );
    actAs(admin.browser);
    await expect(setUserRole(admin.user.id, Role.USER)).rejects.toThrow(
      "You can't do that to your own account"
    );
    expect(await roleOf(user.user.id)).toBe(Role.USER);
    expect(await roleOf(admin.user.id)).toBe(Role.ADMIN);
  });

  test("a banned account can't become an admin", async () => {
    const { user } = await adminAndUser();
    await banUser(user.user.id, { reason: '', duration: 'permanent' });

    expect(await setUserRole(user.user.id, Role.ADMIN)).toEqual({
      error: 'Lift their ban before making them an admin',
    });
  });
});

describe('managing accounts', () => {
  test('signing someone out ends all their sessions', async () => {
    const { user } = await adminAndUser();
    const phone = new Browser();
    await signIn(phone, user.user.email);

    await signOutUser(user.user.id);

    expect(await sessionOf(user.browser)).toBeNull();
    expect(await sessionOf(phone)).toBeNull();
  });

  test('resetting two-step sign-in lets them in with the password', async () => {
    const { user } = await adminAndUser();
    await auth.api.enableTwoFactor({
      body: { password: PASSWORD, method: 'otp' },
      headers: user.browser.headers,
    });
    expect((await signIn(new Browser(), user.user.email)).body).toMatchObject({
      twoFactorRedirect: true,
    });

    await resetTwoFactor(user.user.id);

    const browser = new Browser();
    await signIn(browser, user.user.email);
    expect((await sessionOf(browser))?.user.id).toBe(user.user.id);
  });
});

describe('viewing the site as someone', () => {
  test('not as admins or banned accounts', async () => {
    const { user } = await adminAndUser();
    const other = await createUser({ name: 'Otto', role: Role.ADMIN });
    await banUser(user.user.id, { reason: '', duration: 'permanent' });

    await expect(viewAsUser(other.user.id)).rejects.toThrow(
      "Admins can't view the site as other admins"
    );
    await expect(viewAsUser(user.user.id)).rejects.toThrow(
      "Banned accounts can't be viewed as"
    );
  });

  test('is for looking only: nothing of theirs can change', async () => {
    const { admin, user } = await adminAndUser(Role.EDITOR);
    // What viewAsUser() does, keeping the cookies it sets.
    admin.browser.take(
      await auth.api.impersonateUser({
        body: { userId: user.user.id },
        headers: admin.browser.headers,
        asResponse: true,
      })
    );
    expect((await sessionOf(admin.browser))?.user.id).toBe(user.user.id);
    actAs(admin.browser);

    expect(await toggleLike(plushieId)).toEqual({ error: VIEWING_AS_MESSAGE });
    expect(await addComment(plushieId, { body: 'Hi' })).toEqual({
      ok: false,
      error: VIEWING_AS_MESSAGE,
    });
    await expect(submitPlushie({ name: 'Pickle' })).rejects.toThrow(
      VIEWING_AS_MESSAGE
    );
    await expect(
      auth.api.updateUser({
        body: { name: 'Changed' },
        headers: admin.browser.headers,
      })
    ).rejects.toThrow(VIEWING_AS_MESSAGE);
    await expect(
      auth.api.changePassword({
        body: { currentPassword: PASSWORD, newPassword: 'something new 123' },
        headers: admin.browser.headers,
      })
    ).rejects.toThrow(VIEWING_AS_MESSAGE);
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: user.user.id } })).name
    ).toBe('Bea');

    // Stopping is allowed, and back to the admin's own session.
    admin.browser.take(
      await auth.api.stopImpersonating({
        headers: admin.browser.headers,
        asResponse: true,
      })
    );
    expect((await sessionOf(admin.browser))?.user.id).toBe(admin.user.id);
  });
});
