import 'server-only';

import { UTApi } from 'uploadthing/server';

import { ActivitySubject, snapshotPhotos } from '@/lib/activity';
import { db } from '@/lib/db';

const utapi = new UTApi();

// Uploads younger than this may still be in an open, unsaved form.
const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/**
 * Photos taken off a plushie, or of a deleted one, are kept this long so the
 * change can be reverted. The privacy page says the same.
 */
export const PHOTO_RETENTION_DAYS = 30;

export function photoRetentionCutoff() {
  return new Date(Date.now() - PHOTO_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** The UploadThing file key in a photo URL, e.g. https://x.ufs.sh/f/<key>. */
export function fileKey(url: string) {
  return new URL(url).pathname.split('/').pop()!;
}

/** Photo URLs that plushie changes of the last PHOTO_RETENTION_DAYS show. */
export async function retainedPhotos() {
  const entries = await db.activity.findMany({
    where: {
      subject: ActivitySubject.PLUSHIE,
      createdAt: { gte: photoRetentionCutoff() },
    },
    select: { before: true, after: true },
  });
  return new Set(
    entries.flatMap((entry) => [
      ...snapshotPhotos(entry.before),
      ...snapshotPhotos(entry.after),
    ])
  );
}

export async function deleteFiles(keys: string[]) {
  if (keys.length === 0) return;
  try {
    await utapi.deleteFiles(keys);
  } catch (error) {
    // The plushie is already saved; the orphan sweep will retry later.
    console.error('Failed to delete UploadThing files', error);
  }
}

/**
 * Keys that no plushie uses as its thumbnail or in its gallery, and that no
 * recent change still needs for a revert.
 */
export async function unusedKeys(keys: string[]) {
  const [images, thumbnails, retained] = await Promise.all([
    db.plushieImage.findMany({
      where: { key: { in: keys } },
      select: { key: true },
    }),
    db.plushie.findMany({
      where: { thumbnailKey: { in: keys } },
      select: { thumbnailKey: true },
    }),
    retainedPhotos(),
  ]);
  const inUse = new Set([
    ...images.map((i) => i.key),
    ...thumbnails.map((p) => p.thumbnailKey),
    ...[...retained].map(fileKey),
  ]);
  return keys.filter((key) => !inUse.has(key));
}

/**
 * Deletes files no plushie uses, e.g. uploads from a form that was closed
 * without saving, photos removed more than PHOTO_RETENTION_DAYS ago, or
 * deletes that failed before.
 */
export async function deleteOrphanedFiles() {
  try {
    const cutoff = Date.now() - ORPHAN_GRACE_MS;
    const candidates: string[] = [];
    for (let offset = 0; ;) {
      const { files, hasMore } = await utapi.listFiles({ limit: 500, offset });
      for (const file of files) {
        if (file.status !== 'Deletion Pending' && file.uploadedAt < cutoff) {
          candidates.push(file.key);
        }
      }
      offset += files.length;
      if (!hasMore || files.length === 0) break;
    }
    if (candidates.length === 0) return;

    await deleteFiles(await unusedKeys(candidates));
  } catch (error) {
    console.error('Failed to clean up orphaned UploadThing files', error);
  }
}
