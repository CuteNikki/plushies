import { describe, expect, test } from 'bun:test';

import { revokeOtherSessions, revokeSession } from '@/actions/account';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

import { actAs, Browser, createUser, sessionOf, signIn } from './helpers';
import { sentEmails } from './request';

/** Emails asking to confirm deleting an account. */
const deleteEmails = () =>
  sentEmails.filter((email) => email.kind === 'delete-account');

describe('sessions', () => {
  test('you can end one of yours, not someone else’s', async () => {
    const me = await createUser({ name: 'Mia' });
    const other = await createUser({ name: 'Oli' });
    const phone = new Browser();
    await signIn(phone, me.user.email);
    const phoneSession = (await sessionOf(phone))!.session.id;
    const otherSession = (await sessionOf(other.browser))!.session.id;

    actAs(me.browser);
    expect(await revokeSession(otherSession)).toEqual({
      error: 'That session has already ended',
    });
    expect(await sessionOf(other.browser)).not.toBeNull();

    expect(await revokeSession(phoneSession)).toEqual({});
    expect(await sessionOf(phone)).toBeNull();
    expect(await sessionOf(me.browser)).not.toBeNull();
  });

  test('signing out everywhere else keeps this one', async () => {
    const me = await createUser({ name: 'Mia' });
    const phone = new Browser();
    await signIn(phone, me.user.email);

    actAs(me.browser);
    await revokeOtherSessions();

    expect(await sessionOf(phone)).toBeNull();
    expect(await sessionOf(me.browser)).not.toBeNull();
  });
});

describe('deleting your account', () => {
  const askToDelete = (browser: Browser) =>
    auth.api.deleteUser({ body: {}, headers: browser.headers });

  test('the only admin can’t, so there’s always one', async () => {
    const admin = await createUser({ name: 'Ada', role: Role.ADMIN });

    await expect(askToDelete(admin.browser)).rejects.toThrow(
      "You're the only admin"
    );
    expect(deleteEmails()).toEqual([]);
  });

  test('otherwise it needs the link from the email', async () => {
    const admin = await createUser({ name: 'Ada', role: Role.ADMIN });
    await createUser({ name: 'Otto', role: Role.ADMIN });

    await askToDelete(admin.browser);

    expect(deleteEmails().map((email) => email.to)).toEqual([admin.user.email]);
    expect(await db.user.count({ where: { id: admin.user.id } })).toBe(1);
  });
});
