import 'server-only';

import { AwsClient } from 'aws4fetch';

import { PHOTO_ORIGIN } from '@/lib/photos';

// The bucket, named after the address it's read at. Garage's S3 API takes it
// in the path, so everything under /images.niso.moe/ goes there (see the
// README's Photos section), and the rest is reading photos.
const BUCKET = 'images.niso.moe';

/** How long a link to upload to lasts: plenty to send one photo, too short to keep. */
const UPLOAD_LINK_SECONDS = 300;

/** Our storage, as its S3 API takes requests: signed with the site's key. */
function storage() {
  const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
  const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY must be set for photos'
    );
  }
  return new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: process.env.STORAGE_REGION || 'garage',
    retries: 1,
  });
}

function apiUrl(objectKey = '') {
  return new URL(`/${BUCKET}/${objectKey}`, PHOTO_ORIGIN);
}

/**
 * A link for the browser to upload one file to, straight to storage rather
 * than through the site. It's signed for exactly this type and size, so
 * nothing else can be sent with it, and for a few minutes.
 */
export async function signUpload(
  objectKey: string,
  type: string,
  size: number
) {
  const url = apiUrl(objectKey);
  url.searchParams.set('X-Amz-Expires', String(UPLOAD_LINK_SECONDS));
  const signed = await storage().sign(url.href, {
    method: 'PUT',
    headers: { 'content-type': type, 'content-length': String(size) },
    aws: { signQuery: true, allHeaders: true },
  });
  return signed.url;
}

export type StoredObject = { key: string; size: number; lastModified: Date };

/** Every file whose key starts with `prefix`. */
export async function listObjects(prefix: string) {
  const objects: StoredObject[] = [];
  let token: string | undefined;
  do {
    const url = apiUrl();
    url.searchParams.set('list-type', '2');
    url.searchParams.set('prefix', prefix);
    if (token) url.searchParams.set('continuation-token', token);
    const response = await storage().fetch(url.href, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Listing failed: ${response.status}`);
    const xml = await response.text();
    for (const [, item] of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      objects.push({
        key: unescapeXml(tag(item, 'Key')),
        size: Number(tag(item, 'Size')),
        lastModified: new Date(tag(item, 'LastModified')),
      });
    }
    token =
      tag(xml, 'IsTruncated') === 'true'
        ? unescapeXml(tag(xml, 'NextContinuationToken'))
        : undefined;
  } while (token);
  return objects;
}

export async function deleteObject(objectKey: string) {
  const response = await storage().fetch(apiUrl(objectKey).href, {
    method: 'DELETE',
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new Error(`Deleting ${objectKey} failed: ${response.status}`);
}

/** The text in the first <name> element of `xml`. */
function tag(xml: string, name: string) {
  return new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml)?.[1] ?? '';
}

function unescapeXml(text: string) {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&amp;', '&');
}
