/**
 * Where photos are kept and shown from: Garage on our own server (see the
 * README's Photos section).
 */
export const PHOTO_ORIGIN = 'https://images.niso.moe';
/** This site's photos: its own bucket, which Caddy serves under /plushies/. */
export const PHOTO_BASE = `${PHOTO_ORIGIN}/plushies`;

/**
 * Each photo is kept twice, made in the browser before it's sent: small for
 * lists, cards and previews, large for its plushie's page. Photos are shown
 * cropped to a square, so each is scaled until its shorter side is this many
 * pixels, enough for sharp screens. Nothing bigger is ever shown, so the site
 * never has to resize them.
 */
export const PHOTO_SIZES = { small: 640, large: 1440 } as const;
export type PhotoSize = keyof typeof PHOTO_SIZES;

/** The formats photos are kept in, with their extensions: WebP, or JPEG from a browser that can't write WebP. */
export const PHOTO_TYPES = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
} as const;
export type PhotoType = keyof typeof PHOTO_TYPES;

/** The most one size of a photo can be, as it's sent. */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

// A photo's large size, saved as its URL: <origin>/plushies/<key>/large.<extension>,
// where the key is <database>/<id> (see uploadOwner). One saved while every
// site shared a bucket has no /plushies/, and still loads from that bucket.
const PHOTO_PATH = /^\/(?:plushies\/)?([\w-]+\/[\w-]+)\/large\.(webp|jpg)$/;

/** A photo's key, the folder both its sizes are in, from its URL. Null for a URL that isn't one of ours. */
export function photoKey(url: string) {
  try {
    const { origin, pathname, search, hash } = new URL(url);
    if (origin !== PHOTO_ORIGIN || search || hash) return null;
    return PHOTO_PATH.exec(pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * The photo at `url` (its large size, as saved) in `size`. A URL that isn't
 * ours stays as it is.
 */
export function photoUrl(url: string, size: PhotoSize) {
  if (size === 'large' || !photoKey(url)) return url;
  return url.replace(/\/large\.(\w+)$/, '/small.$1');
}
