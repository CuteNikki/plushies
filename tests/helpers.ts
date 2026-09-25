import { savePlushie } from '@/actions/plushies';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

import { assertTestDatabase, request, uploads } from './request';

export const PASSWORD = 'correct horse battery';

/** Empties every table, keeping the schema. */
export async function resetDatabase() {
  // Checked again right here, where it matters most.
  assertTestDatabase();
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(({ tablename }) => `"${tablename}"`).join(', ');
  await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

/** Keeps cookies between requests, like a browser does. */
export class Browser {
  private cookies = new Map<string, string>();

  /** Takes the cookies a response sets, and drops the ones it expires. */
  take(response: Response) {
    for (const line of response.headers.getSetCookie()) {
      const [pair, ...attributes] = line.split(';');
      const [name, ...value] = pair.split('=');
      const expired = attributes.some((a) => /^\s*max-age=0$/i.test(a));
      if (expired) this.cookies.delete(name.trim());
      else this.cookies.set(name.trim(), value.join('='));
    }
    return response;
  }

  has(name: string) {
    return [...this.cookies.keys()].some((key) => key.endsWith(name));
  }

  forget(name: string) {
    for (const key of this.cookies.keys()) {
      if (key.endsWith(name)) this.cookies.delete(key);
    }
  }

  get cookie() {
    return [...this.cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }

  get headers() {
    return new Headers({ cookie: this.cookie });
  }
}

/** Makes server actions and getSession() see this browser's cookies. */
export function actAs(browser: Browser | null) {
  request.cookie = browser?.cookie ?? '';
}

/**
 * Signs up an account with a password, verified unless told otherwise. It
 * comes back signed in, in its own browser.
 */
export async function createUser({
  name,
  role = Role.USER,
  verified = true,
}: {
  name: string;
  role?: Role;
  verified?: boolean;
}) {
  const browser = new Browser();
  const email = `${name.toLowerCase().replace(/\W+/g, '-')}@example.com`;
  browser.take(
    await auth.api.signUpEmail({
      body: { name, email, password: PASSWORD },
      asResponse: true,
    })
  );
  const user = await db.user.update({
    where: { email },
    data: { role, emailVerified: verified },
  });
  return { user, browser };
}

/** Signs in with email and password, sending the browser's cookies. */
export async function signIn(browser: Browser, email: string) {
  const response = browser.take(
    await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      headers: browser.headers,
      asResponse: true,
    })
  );
  const body = await response.json();
  return { status: response.status, body };
}

export async function signOut(browser: Browser) {
  browser.take(
    await auth.api.signOut({ headers: browser.headers, asResponse: true })
  );
}

/** Who the browser is signed in as, if anyone. */
export async function sessionOf(browser: Browser) {
  return auth.api.getSession({ headers: browser.headers });
}

/** Links a Discord account, as signing in with Discord would. */
export async function linkDiscord(userId: string) {
  await db.account.create({
    data: {
      id: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      providerId: 'discord',
      userId,
    },
  });
}

export async function createPlushie(name: string) {
  return db.plushie.create({
    data: { name, slug: name.toLowerCase(), description: '' },
  });
}

const DAY = 24 * 60 * 60 * 1000;

/** A photo in the pretend UploadThing, uploaded `daysAgo`. */
export function upload(key: string, daysAgo = 0) {
  uploads.set(key, {
    key,
    uploadedAt: Date.now() - daysAgo * DAY,
    status: 'Uploaded',
  });
  return { key, url: `https://test.ufs.sh/f/${key}` };
}

type Photo = { key: string; url: string };

/**
 * Sends the plushie form as the acting user. Returns the error it shows, or
 * where it went after saving.
 */
export async function submitPlushie(fields: {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  species?: string;
  birthday?: string;
  thumbnail?: Photo | null;
  gallery?: Photo[];
}): Promise<{ error?: string; redirectedTo?: string }> {
  const form = new FormData();
  if (fields.id) form.set('id', fields.id);
  form.set('name', fields.name);
  form.set('slug', fields.slug ?? '');
  form.set('description', fields.description ?? 'Very soft.');
  form.set('species', fields.species ?? '');
  form.set('birthday', fields.birthday ?? '');
  for (const key of ['gender', 'pronouns', 'origin', 'traits'])
    form.set(key, '');
  form.set('facts', '[]');
  form.set('thumbnail', JSON.stringify(fields.thumbnail ?? null));
  form.set('gallery', JSON.stringify(fields.gallery ?? []));
  try {
    return await savePlushie({}, form);
  } catch (error) {
    // Saving ends by going to the plushie's page.
    const match = /^Redirected to (.+)$/.exec((error as Error).message);
    if (match) return { redirectedTo: match[1] };
    throw error;
  }
}
