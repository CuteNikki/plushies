import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { UploadThingError } from 'uploadthing/server';

import { auth } from '@/lib/auth';
import {
  canEditPlushies,
  isViewingAs,
  VIEWING_AS_MESSAGE,
} from '@/lib/permissions';

const f = createUploadthing();

async function requireEditor({ req }: { req: Request }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!canEditPlushies(session?.user.role)) {
    throw new UploadThingError('Only editors can upload photos');
  }
  if (isViewingAs(session)) throw new UploadThingError(VIEWING_AS_MESSAGE);
  return { userId: session!.user.id };
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
