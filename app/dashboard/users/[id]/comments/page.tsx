import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { MessageCircleIcon } from 'lucide-react';

import { getCommentList } from '@/data/dashboard';
import { getUserName } from '@/data/users';
import { withQuery } from '@/lib/list-params';
import { requireAdmin } from '@/lib/session';
import { count } from '@/lib/utils';

import { CommentRow } from '@/components/comment-row';
import { EmptyState } from '@/components/empty-state';
import { Reveal } from '@/components/motion';
import { Pagination } from '@/components/pagination';
import { UserSubpageHeader } from '@/components/user-subpage';

export const metadata: Metadata = { title: 'Comments' };

/** Everything someone wrote, newest first, a page at a time. */
export default async function UserCommentsPage(
  props: PageProps<'/dashboard/users/[id]/comments'>
) {
  const session = await requireAdmin();
  const { id } = await props.params;
  const { before } = await props.searchParams;
  // The last comment of the page before.
  const cursor = typeof before === 'string' ? before : null;
  const [user, { comments, total, next }] = await Promise.all([
    getUserName(id),
    getCommentList({ authorId: id, cursor }),
  ]);
  if (!user) notFound();
  const pageHref = (before: string | null) =>
    withQuery(`/dashboard/users/${id}/comments`, { before });

  return (
    <div className='flex flex-col gap-6'>
      <UserSubpageHeader
        user={user}
        title={`${user.name}’s comments`}
        description={`${count(total, 'comment')}, newest first.`}
      />
      {comments.length > 0 ? (
        <Reveal
          as='ul'
          className='flex flex-col divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10'
        >
          {comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              viewer={{ id: session.user.id, admin: true }}
              showAuthor={false}
            />
          ))}
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={MessageCircleIcon}>
            {cursor ? 'No more comments.' : 'No comments yet.'}
          </EmptyState>
        </Reveal>
      )}
      <Pagination
        newest={cursor ? pageHref(null) : null}
        older={next ? pageHref(next) : null}
        olderLabel='Older comments'
      />
    </div>
  );
}
