import Link from 'next/link';

import type { CommentRowData } from '@/data/comment-rows';

import { CommentAuthor } from '@/components/comment-author';
import { DeleteCommentButton } from '@/components/delete-comment-button';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';

/**
 * A comment in the dashboard: which plushie it's on, who wrote it and when,
 * what it answers, and a way to delete it. Without `showAuthor` on pages
 * where they're all by the same person.
 */
export function CommentRow({
  comment,
  viewer,
  showAuthor = true,
}: {
  comment: CommentRowData;
  viewer: { id: string; admin: boolean };
  showAuthor?: boolean;
}) {
  return (
    <Reveal as='li' direction='none' className='flex items-start gap-3 p-4'>
      {/* Which plushie at a glance; its name links there too. */}
      <PlushiePhoto
        plushie={comment.plushie}
        sizes='40px'
        compact
        className='size-10 shrink-0 rounded-lg'
      />
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <Link
              href={`/plushies/${comment.plushie.slug}`}
              className='font-heading font-semibold hover:underline'
            >
              {comment.plushie.name}
            </Link>
            <p className='text-sm text-muted-foreground'>
              {showAuthor && (
                <>
                  <CommentAuthor author={comment.author} link={viewer.admin} />
                  {' · '}
                </>
              )}
              <LocalTime iso={comment.createdAt} />
              {comment.editedAt && ' · edited'}
            </p>
          </div>
          <DeleteCommentButton
            comment={{
              id: comment.id,
              authorName: comment.author?.name ?? null,
              replies: comment.replies,
            }}
            own={comment.author?.id === viewer.id}
            canPurge={viewer.admin}
          />
        </div>
        {comment.replyTo && (
          <p className='truncate border-l-2 border-foreground/15 pl-2 text-sm text-muted-foreground'>
            {comment.replyTo.body === null ? (
              'Replying to a deleted comment'
            ) : (
              <>
                Replying to{' '}
                <CommentAuthor
                  author={comment.replyTo.author}
                  link={viewer.admin}
                />
                : &ldquo;{comment.replyTo.body}&rdquo;
              </>
            )}
          </p>
        )}
        <p className='text-sm wrap-break-word whitespace-pre-line'>
          {comment.body}
        </p>
      </div>
    </Reveal>
  );
}
