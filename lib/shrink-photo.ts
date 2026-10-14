import { PHOTO_SIZES, type PhotoSize, type PhotoType } from '@/lib/photos';

/**
 * A photo in both its sizes (see PHOTO_SIZES), made in the browser before
 * it's uploaded: a phone photo of several MB becomes a few hundred KB, and
 * every page showing it loads that much less. WebP, or JPEG where the browser
 * can't write WebP, the same for both so they share an extension. A GIF keeps
 * only its first frame. Throws if the browser can't read the file.
 */
export async function shrinkPhoto(file: File) {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  }).catch(() => {
    throw new Error(
      `${file.name} couldn't be read. Try a JPEG, PNG or WebP photo.`
    );
  });
  try {
    let type: PhotoType = 'image/webp';
    let large = await draw(bitmap, PHOTO_SIZES.large, type);
    // A browser that can't write WebP hands back a PNG instead.
    if (large.type !== type) {
      type = 'image/jpeg';
      large = await draw(bitmap, PHOTO_SIZES.large, type);
    }
    const small = await draw(bitmap, PHOTO_SIZES.small, type);
    return { type, blobs: { large, small } satisfies Record<PhotoSize, Blob> };
  } finally {
    bitmap.close();
  }
}

/** `bitmap` scaled down until its shorter side is `side`, never up. */
async function draw(bitmap: ImageBitmap, side: number, type: PhotoType) {
  const scale = Math.min(1, side / Math.min(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.85)
  );
  if (!blob) throw new Error("The photo couldn't be made smaller.");
  return blob;
}
