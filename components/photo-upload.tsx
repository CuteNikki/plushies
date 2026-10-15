import { useState } from 'react';

import { ImageUpIcon, Loader2Icon } from 'lucide-react';

import { requestUpload } from '@/actions/plushies';
import type { PlushieImage } from '@/data/plushies';
import { shrinkPhoto } from '@/lib/shrink-photo';
import { cn } from '@/lib/utils';

// The most photos taken from one drop or pick.
const MAX_AT_ONCE = 20;

/** Sends `blob` to the link it was given, telling `onProgress` how much of it has gone, from 0 to 1. */
function send(url: string, blob: Blob, onProgress: (share: number) => void) {
  // XMLHttpRequest rather than fetch, which can't tell how much of an upload has gone.
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', blob.type);
    request.upload.onprogress = (event) =>
      event.lengthComputable && onProgress(event.loaded / event.total);
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error("The photo couldn't be uploaded."));
    request.onerror = () =>
      reject(
        new Error(
          "The photo couldn't be uploaded. Check your connection and try again."
        )
      );
    request.send(blob);
  });
}

/** Makes a photo's two sizes and uploads them straight to storage. */
async function uploadPhoto(file: File, onProgress: (share: number) => void) {
  const { type, blobs } = await shrinkPhoto(file);
  const link = await requestUpload(type, {
    large: blobs.large.size,
    small: blobs.small.size,
  });
  if ('error' in link) throw new Error(link.error);
  const total = blobs.large.size + blobs.small.size;
  await send(link.uploads.small, blobs.small, (share) =>
    onProgress((share * blobs.small.size) / total)
  );
  await send(link.uploads.large, blobs.large, (share) =>
    onProgress((blobs.small.size + share * blobs.large.size) / total)
  );
  return { key: link.key, url: link.url };
}

/**
 * A square tile to drop photos on or click to pick them, which uploads them
 * one after another. `multiple` takes up to 20 at once, otherwise just one.
 */
export function PhotoUpload({
  multiple,
  onUploaded,
  onError,
}: {
  multiple?: boolean;
  /** Called after each photo, so ones already sent aren't lost if a later one fails. */
  onUploaded: (image: PlushieImage) => void;
  onError: (message: string | undefined) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);

  async function upload(files: File[]) {
    const picked = files
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, multiple ? MAX_AT_ONCE : 1);
    if (picked.length === 0) return;
    onError(undefined);
    setProgress(0);
    try {
      for (const [index, file] of picked.entries()) {
        const image = await uploadPhoto(file, (share) =>
          setProgress((index + share) / picked.length)
        );
        onUploaded(image);
      }
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "The photo couldn't be uploaded."
      );
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!busy) void upload([...event.dataTransfer.files]);
      }}
      className={cn(
        'flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/30 bg-muted/40 p-3 text-center transition-colors hover:border-primary/60',
        'has-focus-visible:ring-3 has-focus-visible:ring-ring/50',
        dragging && 'border-primary bg-primary/10',
        busy && 'pointer-events-none'
      )}
    >
      <input
        type='file'
        accept='image/*'
        multiple={multiple}
        className='sr-only'
        disabled={busy}
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          // Emptied, so picking the same file again still counts as a change.
          event.target.value = '';
          void upload(files);
        }}
      />
      {busy ? (
        <>
          <Loader2Icon className='size-8 animate-spin text-primary/60' />
          <span className='text-xs font-semibold text-primary tabular-nums'>
            {Math.round(progress * 100)}%
          </span>
        </>
      ) : (
        <>
          <ImageUpIcon className='size-8 text-primary/60' />
          <span className='text-xs leading-4 text-primary'>
            {multiple ? 'Drop photos or click' : 'Drop a photo or click'}
          </span>
          <span className='text-[0.7rem] text-muted-foreground'>
            {multiple ? `Up to ${MAX_AT_ONCE} at once` : 'One photo'}
          </span>
        </>
      )}
    </label>
  );
}
