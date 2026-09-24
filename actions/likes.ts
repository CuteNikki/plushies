'use server';

import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { Prisma } from '@/lib/generated/prisma/client';
import { isViewingAs, VIEWING_AS_MESSAGE } from '@/lib/permissions';
import { getSession } from '@/lib/session';

export type LikeState = { liked: boolean; count: number };

/** Likes a plushie, or takes the like back if there already is one. */
export async function toggleLike(
  plushieId: string
): Promise<LikeState | { error: string }> {
  const session = await getSession();
  if (!session) return { error: 'Sign in to like plushies' };
  if (isViewingAs(session)) return { error: VIEWING_AS_MESSAGE };

  const plushie = await db.plushie.findUnique({
    where: { id: plushieId },
    select: { slug: true },
  });
  if (!plushie) return { error: 'This plushie no longer exists' };

  const key = { plushieId, userId: session.user.id };
  const { count } = await db.plushieLike.deleteMany({ where: key });
  let liked = false;
  if (count === 0) {
    try {
      await db.plushieLike.create({ data: key });
    } catch (error) {
      // A second click that raced the first: it's liked either way.
      const duplicate =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002';
      if (!duplicate) throw error;
    }
    liked = true;
  }

  // The page is built ahead of time with the count; rebuild just this one.
  revalidatePath(`/plushies/${plushie.slug}`);
  return {
    liked,
    count: await db.plushieLike.count({ where: { plushieId } }),
  };
}
