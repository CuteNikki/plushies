import 'server-only';

import { after } from 'next/server';

import {
  activityCutoff,
  type ActivitySubject,
  pruneActivity,
} from '@/lib/activity';
import { db } from '@/lib/db';

/** What the page knows about plushies as they are now. */
export type ActivityContext = {
  /** Current slug by plushie id, for plushies that still exist. */
  slugs: Map<string, string>;
  /** Photo URLs still in use. The others were deleted from UploadThing. */
  photos: Set<string>;
};

/**
 * The latest entries, optionally only about plushies or users, and what the
 * page needs to know about plushies as they are now.
 */
export async function getActivity({
  subject,
}: {
  subject: ActivitySubject | undefined;
}) {
  const [entries, plushies] = await Promise.all([
    db.activity.findMany({
      where: { subject, createdAt: { gte: activityCutoff() } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.plushie.findMany({
      select: {
        id: true,
        slug: true,
        thumbnailUrl: true,
        gallery: { select: { url: true } },
      },
    }),
  ]);
  // Entries are also removed as new ones come in; this covers quiet times.
  after(pruneActivity);

  const context: ActivityContext = {
    slugs: new Map(plushies.map((plushie) => [plushie.id, plushie.slug])),
    photos: new Set(
      plushies.flatMap((plushie) => [
        ...(plushie.thumbnailUrl ? [plushie.thumbnailUrl] : []),
        ...plushie.gallery.map((image) => image.url),
      ])
    ),
  };
  return { entries, context };
}
