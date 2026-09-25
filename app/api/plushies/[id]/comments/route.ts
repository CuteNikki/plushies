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
  const { searchParams } = new URL(request.url);
  const page = await getComments(
    id,
    searchParams.get('cursor'),
    await getSession(),
    searchParams.get('focus')
  );
  return Response.json(page, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
