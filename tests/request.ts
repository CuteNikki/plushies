/**
 * What the Next.js stand-ins in setup.ts read and record: the request the
 * code under test sees, emails it sends, and work it defers with after().
 * No app imports here, so setup.ts can load it before anything is mocked.
 */

/**
 * Throws unless DATABASE_URL is the throwaway one `bun run test` starts:
 * tests empty the database, so they must never reach a real one.
 */
export function assertTestDatabase() {
  const url = process.env.DATABASE_URL
    ? new URL(process.env.DATABASE_URL)
    : null;
  const local = url?.hostname === '127.0.0.1' || url?.hostname === 'localhost';
  if (!local || url?.pathname !== '/plushies_test') {
    throw new Error(
      'Tests only run against the throwaway database. Run them with `bun run test`, which starts one.'
    );
  }
}

/** The cookies of whoever is acting, as the browser would send them. */
export const request = { cookie: '' };

export type SentEmail = { kind: string; to: string; args: string[] };

export const sentEmails: SentEmail[] = [];

export type StoredFile = { key: string; uploadedAt: number; status: string };

/** Files in the pretend UploadThing, by key. */
export const uploads = new Map<string, StoredFile>();

const deferred: Promise<unknown>[] = [];

/** Work passed to after(), which runs once the response would be sent. */
export function defer(task: () => unknown) {
  deferred.push(Promise.resolve().then(task));
}

/** Waits for everything passed to after(), e.g. activity log entries. */
export async function settle() {
  while (deferred.length > 0) await Promise.all(deferred.splice(0));
}

export function resetRequest() {
  request.cookie = '';
  sentEmails.length = 0;
  uploads.clear();
}
