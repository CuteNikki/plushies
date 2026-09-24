import type { LikeState } from '@/actions/likes';
import { db } from '@/lib/db';
import { getSession } from '@/lib/session';

/**
 * Whether the signed-in account likes a plushie, with the current count. The
 * plushie page is built ahead of time, so this part is fetched separately.
 */
export async function GET(
  _request: Request,
  context: RouteContext<'/api/plushies/[id]/like'>
) {
  const { id } = await context.params;
  const session = await getSession();
  const [count, own] = await Promise.all([
    db.plushieLike.count({ where: { plushieId: id } }),
    session
      ? db.plushieLike.findUnique({
          where: {
            plushieId_userId: { plushieId: id, userId: session.user.id },
          },
        })
      : null,
  ]);
  return Response.json({ liked: !!own, count } satisfies LikeState, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
