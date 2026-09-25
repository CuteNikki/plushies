import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageCircleIcon,
} from 'lucide-react';

import { getCommentList } from '@/data/dashboard';
import { isAdmin } from '@/lib/permissions';
import { requireEditor } from '@/lib/session';
import { count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { CommentRow } from '@/components/comment-row';
import { EmptyState } from '@/components/empty-state';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Comments' };

export default async function CommentsPage(
  props: PageProps<'/dashboard/comments'>
) {
  const session = await requireEditor();
  const admin = isAdmin(session.user.role);
  // The last comment of the page before, for older ones.
  const { before } = await props.searchParams;
  const cursor = typeof before === 'string' ? before : null;
  const { comments, total, next } = await getCommentList(cursor);

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
          {count(total, 'comment')} on the plushies&rsquo; pages, newest first.
        </p>
      </Reveal>

      {comments.length > 0 ? (
        // The card rises as a whole, then its rows fade in without moving.
        <Reveal
          as='ul'
          className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'
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
            {cursor ? 'No older comments.' : 'No comments yet.'}
          </EmptyState>
        </Reveal>
      )}

      {(cursor || next) && (
        <Reveal className='flex justify-between gap-2'>
          {cursor ? (
            <Button variant='outline' size='sm' asChild>
              <Link href='/dashboard/comments'>
                <ChevronLeftIcon />
                Newest
              </Link>
            </Button>
          ) : (
            <span />
          )}
          {next && (
            <Button variant='outline' size='sm' asChild>
              <Link href={`/dashboard/comments?before=${next}`}>
                Older comments
                <ChevronRightIcon />
              </Link>
            </Button>
          )}
        </Reveal>
      )}
    </div>
  );
}
