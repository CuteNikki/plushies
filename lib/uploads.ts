import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

import { ActivitySubject, snapshotPhotos } from '@/lib/activity';
import { db } from '@/lib/db';
import {
  PHOTO_ORIGIN,
  PHOTO_TYPES,
  photoKey,
  type PhotoSize,
  type PhotoType,
} from '@/lib/photos';
import { deleteObject, listObjects, signUpload } from '@/lib/storage';

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

/** The space photos can take up: the bucket's quota in Garage (see the README's Photos section). */
export const STORAGE_LIMIT_BYTES = 10 * 1024 ** 3;

/**
 * Names the database this site runs on, from its host and name. Its photos
 * are kept in a folder of that name, so the orphan sweep only deletes this
 * database's files: another database on the same storage, like a local copy,
 * doesn't know these plushies and would otherwise see every photo as unused.
 */
export const uploadOwner = (() => {
  const { host, pathname } = new URL(process.env.DATABASE_URL!);
  return createHash('sha256')
    .update(host + pathname)
    .digest('base64url')
    .slice(0, 12);
})();

// A photo's key as newUpload makes them, and nothing else: deleting by a
// shorter one, or another database's, could take photos that aren't ours.
const OWN_KEY = new RegExp(`^${uploadOwner}/[\\w-]+$`);

/**
 * Links for the browser to upload a new photo's two sizes to (see
 * PhotoUpload), and the key and URL to save it under once they're there.
 */
export async function newUpload(
  type: PhotoType,
  sizes: Record<PhotoSize, number>
) {
  const key = `${uploadOwner}/${randomUUID()}`;
  const extension = PHOTO_TYPES[type];
  const [large, small] = await Promise.all(
    (['large', 'small'] as const).map((size) =>
      signUpload(`${key}/${size}.${extension}`, type, sizes[size])
    )
  );
  return {
    key,
    url: `${PHOTO_ORIGIN}/${key}/large.${extension}`,
    uploads: { large, small },
  };
}

/** The key of the photo at `url`, or of an UploadThing one not moved yet. */
export function fileKey(url: string) {
  return photoKey(url) ?? new URL(url).pathname.split('/').pop()!;
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

/** The key of the photo a stored file is a size of, e.g. <database>/<id>. */
const keyOf = (objectKey: string) => objectKey.split('/').slice(0, 2).join('/');

/** How much of the photo storage is used, by every database's photos. */
export async function getStorageUsage() {
  const objects = await listObjects('');
  return {
    usedBytes: objects.reduce((sum, object) => sum + object.size, 0),
    limitBytes: STORAGE_LIMIT_BYTES,
    photos: new Set(objects.map((object) => keyOf(object.key))).size,
  };
}

/** Deletes photos, both sizes of each. Only this database's. */
export async function deleteFiles(keys: string[]) {
  for (const key of keys.filter((key) => OWN_KEY.test(key))) {
    try {
      for (const object of await listObjects(`${key}/`)) {
        await deleteObject(object.key);
      }
    } catch (error) {
      // The plushie is already saved; the orphan sweep will retry later.
      console.error(`Failed to delete photo ${key}`, error);
    }
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
 * Deletes photos no plushie uses, e.g. uploads from a form that was closed
 * without saving, photos removed more than PHOTO_RETENTION_DAYS ago, or
 * deletes that failed before. Only this database's, see uploadOwner.
 */
export async function deleteOrphanedFiles() {
  try {
    const cutoff = Date.now() - ORPHAN_GRACE_MS;
    // A photo is as new as the newest of its sizes.
    const newest = new Map<string, number>();
    for (const object of await listObjects(`${uploadOwner}/`)) {
      const key = keyOf(object.key);
      const time = object.lastModified.getTime();
      newest.set(key, Math.max(newest.get(key) ?? 0, time));
    }
    const candidates = [...newest]
      .filter(([, time]) => time < cutoff)
      .map(([key]) => key);
    if (candidates.length === 0) return;

    await deleteFiles(await unusedKeys(candidates));
  } catch (error) {
    console.error('Failed to clean up orphaned photos', error);
  }
}
