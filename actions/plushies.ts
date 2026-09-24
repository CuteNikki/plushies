'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';

import {
  ActivitySubject,
  ActivityType,
  logActivity,
  plushieSnapshot,
} from '@/lib/activity';
import { isNotInFuture, parseBirthday } from '@/lib/birthday';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import {
  canEditPlushies,
  isViewingAs,
  VIEWING_AS_MESSAGE,
} from '@/lib/permissions';
import { getSession } from '@/lib/session';
import { deleteFiles, deleteOrphanedFiles, unusedKeys } from '@/lib/uploads';

export type FormState = { error?: string };

const image = z.object({
  key: z.string().min(1),
  url: z
    .url()
    .refine(
      (url) => new URL(url).hostname.endsWith('.ufs.sh'),
      'Photos must be uploaded through the form'
    ),
});

const optional = z
  .string()
  .trim()
  .transform((value) => value || null);

const plushieSchema = z.object({
  // Only sent when editing an existing plushie.
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Give your plushie a name'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]*$/, 'The URL name can only use a-z, 0-9 and dashes'),
  description: z.string().trim().min(1, 'Write a little description'),
  species: optional,
  // Just the year, year and month, or the full date.
  birthday: optional
    .refine(
      (value) => !value || parseBirthday(value),
      "That birthday isn't a real date"
    )
    .refine(
      (value) => !value || isNotInFuture(parseBirthday(value)!),
      "The birthday can't be in the future"
    ),
  gender: optional,
  pronouns: optional,
  origin: optional,
  traits: z.string().transform((value) =>
    value
      .split(',')
      .map((trait) => trait.trim())
      .filter(Boolean)
  ),
  facts: z
    .array(z.object({ label: z.string().trim(), value: z.string().trim() }))
    .transform((facts) => facts.filter((fact) => fact.label && fact.value)),
  thumbnail: image.nullable(),
  gallery: z.array(image),
});

function slugify(name: string) {
  return name
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseJson(value: FormDataEntryValue | null) {
  try {
    return JSON.parse(String(value ?? 'null'));
  } catch {
    return null;
  }
}

/** Returns who is making the change, for the activity log. */
async function assertEditor() {
  const session = await getSession();
  if (!canEditPlushies(session?.user.role)) {
    throw new Error('Only editors can change plushies');
  }
  if (isViewingAs(session)) throw new Error(VIEWING_AS_MESSAGE);
  return { id: session.user.id, name: session.user.name };
}

const withGallery = {
  gallery: { orderBy: { position: 'asc' } },
} satisfies Prisma.PlushieInclude;

export async function savePlushie(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  const actor = await assertEditor();

  const parsed = plushieSchema.safeParse({
    ...Object.fromEntries(formData),
    facts: parseJson(formData.get('facts')) ?? [],
    thumbnail: parseJson(formData.get('thumbnail')),
    gallery: parseJson(formData.get('gallery')) ?? [],
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { id, thumbnail, gallery, ...fields } = parsed.data;
  const slug = fields.slug || slugify(fields.name);
  if (!slug) return { error: 'Pick a URL name for your plushie' };

  const data = {
    ...fields,
    slug,
    thumbnailKey: thumbnail?.key ?? null,
    thumbnailUrl: thumbnail?.url ?? null,
  };
  const galleryRows = gallery.map((image, position) => ({
    ...image,
    position,
  }));

  let logged: Promise<void>;
  try {
    if (id) {
      const existing = await db.plushie.findUnique({
        where: { id },
        include: withGallery,
      });
      if (!existing) return { error: 'This plushie no longer exists' };

      const updated = await db.plushie.update({
        where: { id },
        data: {
          ...data,
          gallery: { deleteMany: {}, create: galleryRows },
        },
        include: withGallery,
      });
      logged = logActivity({
        type: ActivityType.UPDATED,
        subject: ActivitySubject.PLUSHIE,
        subjectId: id,
        subjectName: updated.name,
        actor,
        before: plushieSnapshot(existing),
        after: plushieSnapshot(updated),
      });
    } else {
      const created = await db.plushie.create({
        data: { ...data, gallery: { create: galleryRows } },
        include: withGallery,
      });
      logged = logActivity({
        type: ActivityType.CREATED,
        subject: ActivitySubject.PLUSHIE,
        subjectId: created.id,
        subjectName: created.name,
        actor,
        after: plushieSnapshot(created),
      });
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return { error: `Another plushie already uses the URL name "${slug}"` };
    }
    throw error;
  }

  // Removed photos stay for PHOTO_RETENTION_DAYS, for reverts. The cleanup
  // waits for the entry that keeps them, then deletes older leftovers.
  after(async () => {
    await logged;
    await deleteOrphanedFiles();
  });
  revalidatePath('/', 'layout');
  redirect(`/plushies/${slug}`);
}

export async function deletePlushie(id: string) {
  const actor = await assertEditor();

  const plushie = await db.plushie.delete({
    where: { id },
    include: withGallery,
  });
  const logged = logActivity({
    type: ActivityType.DELETED,
    subject: ActivitySubject.PLUSHIE,
    subjectId: plushie.id,
    subjectName: plushie.name,
    actor,
    before: plushieSnapshot(plushie),
  });
  // Its photos stay for PHOTO_RETENTION_DAYS, so it can be restored.
  after(async () => {
    await logged;
    await deleteOrphanedFiles();
  });

  revalidatePath('/', 'layout');
  redirect('/dashboard/plushies');
}

/** Removes photos that were uploaded but never saved, e.g. on cancel. */
export async function discardUploads(keys: string[]) {
  await assertEditor();
  if (keys.length === 0) return;

  await deleteFiles(await unusedKeys(keys));
}
