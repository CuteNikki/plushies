import type { Metadata } from 'next';

import { MessageCircleIcon } from 'lucide-react';

import { commentKinds, commentSorts, getCommentList } from '@/data/dashboard';
import { oneOf, plainQuery, searchQuery, withQuery } from '@/lib/list-params';
import { isAdmin } from '@/lib/permissions';
import { requireEditor } from '@/lib/session';
import { count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { CommentRow } from '@/components/comment-row';
import { EmptyState } from '@/components/empty-state';
import { ListControls } from '@/components/list-controls';
import { Reveal } from '@/components/motion';
import { Pagination } from '@/components/pagination';

export const metadata: Metadata = { title: 'Comments' };

export default async function CommentsPage(
  props: PageProps<'/dashboard/comments'>
) {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);
  const searchParams = await props.searchParams;
  const query = plainQuery(searchParams);
  const q = searchQuery(searchParams.q);
  const sort = oneOf(searchParams.sort, commentSorts);
  const kind = oneOf(searchParams.show, commentKinds);
  // The last comment of the page before.
  const cursor =
    typeof searchParams.before === 'string' ? searchParams.before : null;
  const { comments, total, next } = await getCommentList({
    cursor,
    q,
    sort,
    kind,
  });
  const filtered = !!q || kind !== 'all';
  const pageHref = (before: string | null) =>
    withQuery('/dashboard/comments', { ...query, before });

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex'>
        <BackButton href='/dashboard'>Dashboard</BackButton>
      </Reveal>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Comments
        </h1>
        <p className='text-pretty text-muted-foreground'>
          {filtered
            ? `${count(total, 'comment')} match.`
            : `${count(total, 'comment')} on the plushies’ pages.`}
        </p>
      </Reveal>

      <Reveal>
        <ListControls
          query={query}
          search={{
            label: 'Search comments',
            placeholder: 'Search text, names or plushies',
          }}
          selects={[
            {
              param: 'sort',
              label: 'Order',
              options: [
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
              ],
            },
            {
              param: 'show',
              label: 'Show',
              options: [
                { value: 'all', label: 'All comments' },
                { value: 'top', label: 'Not replies' },
                { value: 'replies', label: 'Only replies' },
                { value: 'reported', label: 'Reported' },
              ],
            },
          ]}
        />
      </Reveal>

      {comments.length > 0 ? (
        // The card rises as a whole, then its rows fade in without moving.
        <Reveal
          as='ul'
          className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'
        >
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              viewer={{ id: session.user.id, admin }}
            />
          ))}
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={MessageCircleIcon}>
            {filtered
              ? 'No comments match.'
              : cursor
                ? 'No more comments.'
                : 'No comments yet.'}
          </EmptyState>
        </Reveal>
      )}

      <Pagination
        newest={cursor ? pageHref(null) : null}
        older={next ? pageHref(next) : null}
        newestLabel={sort === 'oldest' ? 'Oldest' : 'Newest'}
        olderLabel={sort === 'oldest' ? 'Newer comments' : 'Older comments'}
      />
    </div>
  );
}
