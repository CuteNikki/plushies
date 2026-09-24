'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';

import { auth } from '@/lib/auth';
import { isNotInFuture, parseBirthday } from '@/lib/birthday';
import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { canEditPlushies, isAdmin, isRole } from '@/lib/permissions';
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
  id: optional,
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

async function assertEditor() {
  const session = await getSession();
  if (!canEditPlushies(session?.user.role)) {
    throw new Error('Only editors can change plushies');
  }
}

export async function savePlushie(
  _state: FormState,
  formData: FormData
): Promise<FormState> {
  await assertEditor();

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

  let removedKeys: string[] = [];
  try {
    if (id) {
      const existing = await db.plushie.findUnique({
        where: { id },
        include: { gallery: true },
      });
      if (!existing) return { error: 'This plushie no longer exists' };

      const keptKeys = new Set([thumbnail?.key, ...gallery.map((i) => i.key)]);
      removedKeys = [
        existing.thumbnailKey,
        ...existing.gallery.map((i) => i.key),
      ].filter((key): key is string => !!key && !keptKeys.has(key));

      await db.plushie.update({
        where: { id },
        data: {
          ...data,
          gallery: { deleteMany: {}, create: galleryRows },
        },
      });
    } else {
      await db.plushie.create({
        data: { ...data, gallery: { create: galleryRows } },
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

  await deleteFiles(removedKeys);
  after(deleteOrphanedFiles);
  revalidatePath('/', 'layout');
  redirect(`/plushies/${slug}`);
}

export async function deletePlushie(id: string) {
  await assertEditor();

  const plushie = await db.plushie.delete({
    where: { id },
    include: { gallery: true },
  });
  await deleteFiles(
    [plushie.thumbnailKey, ...plushie.gallery.map((i) => i.key)].filter(
      (key): key is string => !!key
    )
  );
  after(deleteOrphanedFiles);

  revalidatePath('/', 'layout');
  redirect('/dashboard/plushies');
}

/** Removes photos that were uploaded but never saved, e.g. on cancel. */
export async function discardUploads(keys: string[]) {
  await assertEditor();
  if (keys.length === 0) return;

  await deleteFiles(await unusedKeys(keys));
}

/** Only admins can manage users, and never their own account from here. */
async function assertCanManage(userId: string) {
  const session = await getSession();
  if (!isAdmin(session?.user.role)) {
    throw new Error('Only admins can do that');
  }
  if (session.user.id === userId) {
    throw new Error("You can't do that to your own account");
  }
}

export async function setUserRole(userId: string, role: string) {
  await assertCanManage(userId);
  if (!isRole(role)) throw new Error('Unknown role');

  await auth.api.setRole({
    body: { userId, role },
    headers: await headers(),
  });
  revalidatePath('/dashboard/users');
}

export async function sendUserPasswordReset(userId: string) {
  await assertCanManage(userId);
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  // Also works for Discord-only accounts: it adds a password to them.
  await auth.api.requestPasswordReset({
    body: { email: user.email, redirectTo: '/reset-password' },
  });
}

export async function signOutUser(userId: string) {
  await assertCanManage(userId);
  await auth.api.revokeUserSessions({
    body: { userId },
    headers: await headers(),
  });
}

export async function deleteUser(userId: string) {
  await assertCanManage(userId);
  await auth.api.removeUser({ body: { userId }, headers: await headers() });
  revalidatePath('/dashboard/users');
}
