// Usage: bun run move-photos [--write]
// Moves photos still on UploadThing to our own storage (see the README's
// Photos section), in both sizes, and points the plushies at the new ones.
// Only the photos plushies have now: the activity log still points at the old
// ones, so reverting a change from before would bring those back. Without
// --write it only reports what it would move. Photos that can't be downloaded
// are left as they are, and running it again tries them again. The files on
// UploadThing are left alone.
import 'dotenv/config';

import { createHash, randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { AwsClient } from 'aws4fetch';
import sharp from 'sharp';

import { PrismaClient } from '../lib/generated/prisma/client';
import { PHOTO_ORIGIN, PHOTO_SIZES, photoKey } from '../lib/photos';

const write = process.argv.includes('--write');

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// The same as uploadOwner in lib/uploads.ts, which only loads inside the site.
const owner = (() => {
  const { host, pathname } = new URL(process.env.DATABASE_URL!);
  return createHash('sha256')
    .update(host + pathname)
    .digest('base64url')
    .slice(0, 12);
})();

const storage = new AwsClient({
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  service: 's3',
  region: process.env.STORAGE_REGION || 'garage',
});

const [plushies, images] = await Promise.all([
  db.plushie.findMany({
    where: { thumbnailUrl: { not: null } },
    select: { thumbnailUrl: true },
  }),
  db.plushieImage.findMany({ select: { url: true } }),
]);
const urls = [
  ...new Set([
    ...plushies.map((p) => p.thumbnailUrl!),
    ...images.map((i) => i.url),
  ]),
].filter((url) => !photoKey(url));

console.log(`${urls.length} photos to move.`);
if (!write) {
  console.log('Run with --write to move them.');
  process.exit(0);
}

async function download(url: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status === 404) return null;
      if (response.ok) return Buffer.from(await response.arrayBuffer());
    } catch {}
  }
  return null;
}

/** Both sizes of the photo at `url` in storage, and its new URL. Null if it couldn't be downloaded. */
async function move(url: string) {
  const original = await download(url);
  if (!original) return null;
  const key = `${owner}/${randomUUID()}`;
  for (const [size, side] of Object.entries(PHOTO_SIZES)) {
    // Like the browser does: upright, its shorter side `side`, never bigger.
    const webp = await sharp(original)
      .rotate()
      .resize(side, side, { fit: 'outside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const response = await storage.fetch(
      `${PHOTO_ORIGIN}/images.niso.moe/${key}/${size}.webp`,
      {
        method: 'PUT',
        headers: { 'content-type': 'image/webp' },
        body: webp,
      }
    );
    if (!response.ok) {
      throw new Error(
        `Uploading ${key}/${size}.webp failed: ${response.status}`
      );
    }
  }
  return { key, url: `${PHOTO_ORIGIN}/${key}/large.webp` };
}

const moved = new Map<string, { key: string; url: string }>();
for (const [index, url] of urls.entries()) {
  const photo = await move(url);
  if (photo) moved.set(url, photo);
  console.log(
    `${index + 1}/${urls.length} ${photo ? 'moved' : 'not found'}: ${url}`
  );
}

await db.$transaction(
  async (tx) => {
    for (const [old, photo] of moved) {
      await tx.plushie.updateMany({
        where: { thumbnailUrl: old },
        data: { thumbnailKey: photo.key, thumbnailUrl: photo.url },
      });
      await tx.plushieImage.updateMany({
        where: { url: old },
        data: { key: photo.key, url: photo.url },
      });
    }
  },
  { timeout: 120_000 }
);

console.log(
  `Moved ${moved.size} of ${urls.length}. ${urls.length - moved.size} couldn't be downloaded and are left as they were.`
);
await db.$disconnect();
