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
import {
  findGroup,
  makeRoomAfter,
  nextPosition,
  removeEmptyGroups,
} from '@/lib/plushie-order';
import { changedKeys } from '@/lib/revert';
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

const GROUP_NAME_MAX = 60;

const groupName = z
  .string()
  .trim()
  .max(
    GROUP_NAME_MAX,
    `Keep the group's name under ${GROUP_NAME_MAX} characters`
  );

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
    // Zod runs this even when the check above failed, so it skips those.
    .refine((value) => {
      const birthday = value && parseBirthday(value);
      return !birthday || isNotInFuture(birthday);
    }, "The birthday can't be in the future"),
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
  group: groupName.optional().transform((value) => value || null),
  /** Duplicating: the plushie to go right after, if in the same group. */
  placeAfter: z.string().optional(),
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

/**
 * Where a saved plushie goes. They stay put unless they join or leave a
 * group; then they go last in it, or right after the plushie they were
 * copied from if that one is there too. A new group takes the place of the
 * plushie that starts it.
 */
async function placement(
  tx: Prisma.TransactionClient,
  {
    existing,
    name,
    placeAfter,
  }: {
    existing: { groupId: string | null; position: number } | null;
    name: string | null;
    placeAfter?: string;
  }
): Promise<{ groupId: string | null; position: number }> {
  const group = name ? await findGroup(tx, name) : null;
  if (existing && (name ? group?.id : null) === existing.groupId) {
    return { groupId: existing.groupId, position: existing.position };
  }
  const source = placeAfter
    ? await tx.plushie.findUnique({
        where: { id: placeAfter },
        select: { groupId: true, position: true },
      })
    : null;

  if (name && !group) {
    const position =
      existing && !existing.groupId
        ? existing.position
        : source && !source.groupId
          ? await makeRoomAfter(tx, null, source.position)
          : await nextPosition(tx, null);
    const created = await tx.plushieGroup.create({ data: { name, position } });
    return { groupId: created.id, position: 1 };
  }
  const groupId = group?.id ?? null;
  if (source && source.groupId === groupId) {
    return {
      groupId,
      position: await makeRoomAfter(tx, groupId, source.position),
    };
  }
  return { groupId, position: await nextPosition(tx, groupId) };
}

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

  const { id, thumbnail, gallery, group, placeAfter, ...fields } = parsed.data;
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
      const saved = await db.$transaction(async (tx) => {
        const existing = await tx.plushie.findUnique({
          where: { id },
          include: withGallery,
        });
        if (!existing) return null;
        const updated = await tx.plushie.update({
          where: { id },
          data: {
            ...data,
            ...(await placement(tx, { existing, name: group })),
            gallery: { deleteMany: {}, create: galleryRows },
          },
          include: withGallery,
        });
        await removeEmptyGroups(tx);
        return { existing, updated };
      });
      if (!saved) return { error: 'This plushie no longer exists' };

      const before = plushieSnapshot(saved.existing);
      const after = plushieSnapshot(saved.updated);
      // Only joining or leaving a group isn't in the history.
      logged =
        changedKeys(before, after).length > 0
          ? logActivity({
              type: ActivityType.UPDATED,
              subject: ActivitySubject.PLUSHIE,
              subjectId: id,
              subjectName: saved.updated.name,
              actor,
              before,
              after,
            })
          : Promise.resolve();
    } else {
      const created = await db.$transaction(async (tx) =>
        tx.plushie.create({
          data: {
            ...data,
            ...(await placement(tx, {
              existing: null,
              name: group,
              placeAfter,
            })),
            gallery: { create: galleryRows },
          },
          include: withGallery,
        })
      );
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

export async function deletePlushie(
  id: string,
  options: { backToList?: boolean } = {}
) {
  const actor = await assertEditor();

  const plushie = await db.$transaction(async (tx) => {
    const deleted = await tx.plushie.delete({
      where: { id },
      include: withGallery,
    });
    await removeEmptyGroups(tx);
    return deleted;
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
  // From its edit page, which is gone now; lists just refresh.
  if (options.backToList) redirect('/dashboard/plushies');
}

/** Removes photos that were uploaded but never saved, e.g. on cancel. */
export async function discardUploads(keys: string[]) {
  await assertEditor();
  if (keys.length === 0) return;

  await deleteFiles(await unusedKeys(keys));
}

const orderSchema = z.array(
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('plushie'), id: z.string() }),
    z.object({
      kind: z.literal('group'),
      id: z.string(),
      plushieIds: z.array(z.string()),
    }),
  ])
);

export type OrderInput = z.infer<typeof orderSchema>;

/**
 * Saves your order: the groups and the plushies outside one, and each
 * group's plushies. Plushies moved into or out of a group on the arrange
 * page change group here too. Groups deleted meanwhile are skipped, so
 * their plushies stay where they are.
 */
export async function saveOrder(
  input: OrderInput
): Promise<{ error?: string }> {
  await assertEditor();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { error: 'That order couldn’t be saved' };

  await db.$transaction(async (tx) => {
    const groups = new Set(
      (await tx.plushieGroup.findMany({ select: { id: true } })).map(
        (group) => group.id
      )
    );
    await Promise.all(
      parsed.data.flatMap((item, index) =>
        item.kind === 'plushie'
          ? [
              tx.plushie.updateMany({
                where: { id: item.id },
                data: { groupId: null, position: index + 1 },
              }),
            ]
          : groups.has(item.id)
            ? [
                tx.plushieGroup.update({
                  where: { id: item.id },
                  data: { position: index + 1 },
                }),
                ...item.plushieIds.map((plushieId, position) =>
                  tx.plushie.updateMany({
                    where: { id: plushieId },
                    data: { groupId: item.id, position: position + 1 },
                  })
                ),
              ]
            : []
      )
    );
    await removeEmptyGroups(tx);
  });
  revalidatePath('/', 'layout');
  return {};
}

/**
 * Moves a plushie into a group by name, starting it if there's none by that
 * name. A new group goes where the plushie was, or right after the group
 * they left.
 */
export async function moveToNewGroup(
  plushieId: string,
  input: string
): Promise<{ error?: string }> {
  await assertEditor();
  const parsed = groupName.min(1, 'Give the group a name').safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const name = parsed.data;

  const moved = await db.$transaction(async (tx) => {
    const plushie = await tx.plushie.findUnique({
      where: { id: plushieId },
      include: { group: true },
    });
    if (!plushie) return false;
    const existing = await findGroup(tx, name);
    if (existing) {
      if (existing.id !== plushie.groupId) {
        await tx.plushie.update({
          where: { id: plushieId },
          data: {
            groupId: existing.id,
            position: await nextPosition(tx, existing.id),
          },
        });
      }
    } else {
      const position = plushie.group
        ? await makeRoomAfter(tx, null, plushie.group.position)
        : plushie.position;
      const group = await tx.plushieGroup.create({ data: { name, position } });
      await tx.plushie.update({
        where: { id: plushieId },
        data: { groupId: group.id, position: 1 },
      });
    }
    await removeEmptyGroups(tx);
    return true;
  });
  if (!moved) return { error: 'This plushie no longer exists' };
  revalidatePath('/', 'layout');
  return {};
}

export async function renameGroup(
  id: string,
  input: string
): Promise<{ error?: string }> {
  await assertEditor();
  const parsed = groupName.min(1, 'Give the group a name').safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const name = parsed.data;

  const taken = await findGroup(db, name);
  if (taken && taken.id !== id) {
    return { error: `There’s already a group called “${taken.name}”` };
  }
  await db.plushieGroup.update({ where: { id }, data: { name } });
  revalidatePath('/', 'layout');
  return {};
}
