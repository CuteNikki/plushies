import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError, UTFiles } from 'uploadthing/server';

import { auth } from '@/lib/auth';
import {
  canEditPlushies,
  isViewingAs,
  VIEWING_AS_MESSAGE,
} from '@/lib/permissions';
import { newUploadId } from '@/lib/uploads';

const f = createUploadthing();

async function requireEditor({
  req,
  files,
}: {
  req: Request;
  files: readonly { name: string; size: number; type: string }[];
}) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!canEditPlushies(session?.user.role)) {
    throw new UploadThingError('Only editors can upload photos');
  }
  if (isViewingAs(session)) throw new UploadThingError(VIEWING_AS_MESSAGE);
  return {
    userId: session!.user.id,
    // Marks the files as this database's, for the orphan sweep.
    [UTFiles]: files.map((file) => ({ ...file, customId: newUploadId() })),
  };
}

// The plushie form saves the key and URL, so nothing to store on completion.
export const uploadRouter = {
  plushieThumbnail: f({ image: { maxFileSize: '8MB', maxFileCount: 1 } })
    .middleware(requireEditor)
    .onUploadComplete(({ file }) => ({ key: file.key, url: file.ufsUrl })),
  plushieImage: f({ image: { maxFileSize: '8MB', maxFileCount: 20 } })
    .middleware(requireEditor)
    .onUploadComplete(({ file }) => ({ key: file.key, url: file.ufsUrl })),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
