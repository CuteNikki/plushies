import { getComments } from '@/lib/comments';
import { getSession } from '@/lib/session';

/**
 * A page of a plushie's comments, with what the viewer may do. The plushie
 * page is built ahead of time, so comments are fetched separately.
 */
export async function GET(
  request: Request,
  context: RouteContext<'/api/plushies/[id]/comments'>
) {
  const { id } = await context.params;
  const cursor = new URL(request.url).searchParams.get('cursor');
  const page = await getComments(id, cursor, await getSession());
  return Response.json(page, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
