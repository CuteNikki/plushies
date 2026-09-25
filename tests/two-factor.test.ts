import { describe, expect, test } from 'bun:test';

import { forgetTrustedDevices } from '@/actions/account';
import { auth } from '@/lib/auth';

import {
  actAs,
  Browser,
  createUser,
  linkDiscord,
  PASSWORD,
  sessionOf,
  signIn,
  signOut,
} from './helpers';
import { sentEmails } from './request';

/** Someone with two-step sign-in on, using email codes. */
async function withTwoFactor() {
  const account = await createUser({ name: 'Tess' });
  account.browser.take(
    await auth.api.enableTwoFactor({
      body: { password: PASSWORD, method: 'otp' },
      headers: account.browser.headers,
      asResponse: true,
    })
  );
  return account;
}

/** Asks for a code by email and returns it, as the code page does. */
async function emailedCode(browser: Browser) {
  browser.take(
    await auth.api.sendTwoFactorOTP({
      body: {},
      headers: browser.headers,
      asResponse: true,
    })
  );
  const email = sentEmails.findLast((e) => e.kind === 'two-factor-code');
  if (!email) throw new Error('No code was sent');
  return email.args[1];
}

async function enterCode(browser: Browser, code: string, trustDevice = false) {
  const response = browser.take(
    await auth.api.verifyTwoFactorOTP({
      body: { code, trustDevice },
      headers: browser.headers,
      asResponse: true,
    })
  );
  return response.status;
}

/** Signs in with the password and, if asked, a code. True if asked. */
async function signInAskedForCode(browser: Browser, email: string) {
  const { body } = await signIn(browser, email);
  return !!body.twoFactorRedirect;
}

describe('two-step sign-in', () => {
  test('the password alone signs nobody in; the code does', async () => {
    const { user } = await withTwoFactor();
    const browser = new Browser();

    expect(await signInAskedForCode(browser, user.email)).toBe(true);
    expect(await sessionOf(browser)).toBeNull();

    expect(await enterCode(browser, await emailedCode(browser))).toBe(200);
    expect((await sessionOf(browser))?.user.id).toBe(user.id);
  });

  test('a wrong code signs nobody in', async () => {
    const { user } = await withTwoFactor();
    const browser = new Browser();
    await signInAskedForCode(browser, user.email);
    const code = await emailedCode(browser);
    const wrong = code === '000000' ? '111111' : '000000';

    expect(await enterCode(browser, wrong)).not.toBe(200);
    expect(await sessionOf(browser)).toBeNull();
  });

  test('is still asked for with Discord linked', async () => {
    const { user } = await withTwoFactor();
    await linkDiscord(user.id);

    expect(await signInAskedForCode(new Browser(), user.email)).toBe(true);
  });

  test("isn't asked for without it", async () => {
    const { user } = await createUser({ name: 'Nia' });
    const browser = new Browser();

    expect(await signInAskedForCode(browser, user.email)).toBe(false);
    expect((await sessionOf(browser))?.user.id).toBe(user.id);
  });
});

describe('trusted devices', () => {
  /** Signs in on a new browser, ticking "Don't ask again", then out. */
  async function trustedBrowser(email: string) {
    const browser = new Browser();
    await signInAskedForCode(browser, email);
    await enterCode(browser, await emailedCode(browser), true);
    await signOut(browser);
    return browser;
  }

  test('skip the code, on that device only', async () => {
    const { user } = await withTwoFactor();
    const trusted = await trustedBrowser(user.email);

    expect(await signInAskedForCode(trusted, user.email)).toBe(false);
    expect((await sessionOf(trusted))?.user.id).toBe(user.id);
    expect(await signInAskedForCode(new Browser(), user.email)).toBe(true);
  });

  test('"Forget trusted devices" asks everywhere again', async () => {
    const { user, browser } = await withTwoFactor();
    const trusted = await trustedBrowser(user.email);

    actAs(browser);
    expect(await forgetTrustedDevices()).toEqual({});

    expect(await signInAskedForCode(trusted, user.email)).toBe(true);
  });

  test('turning two-step sign-in off forgets them all', async () => {
    const { user } = await withTwoFactor();
    const laptop = await trustedBrowser(user.email);
    const phone = await trustedBrowser(user.email);

    // Off and on again from the phone. Better Auth itself only forgets the
    // device it's turned off on; the laptop must be forgotten too.
    await signInAskedForCode(phone, user.email);
    for (const endpoint of ['disableTwoFactor', 'enableTwoFactor'] as const) {
      phone.take(
        await auth.api[endpoint]({
          body: { password: PASSWORD, method: 'otp' },
          headers: phone.headers,
          asResponse: true,
        })
      );
    }

    expect(await signInAskedForCode(laptop, user.email)).toBe(true);
  });
});
