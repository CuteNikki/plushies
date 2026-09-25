import type { CommentRowData } from '@/data/comment-rows';

import { CommentAuthor } from '@/components/comment-author';
import { CommentMenu } from '@/components/comment-menu';
import { DeleteCommentButton } from '@/components/delete-comment-button';
import { ItemMenuButton } from '@/components/item-menu';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';
import { RowLink } from '@/components/row-link';

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
    <Reveal as='li' direction='none'>
      {/* All of it goes to the comment on the plushie’s page, except the
          text, which sits above the link so it can be selected. */}
      <CommentMenu
        comment={comment}
        viewer={viewer}
        className='relative flex items-start gap-3 p-4'
      >
        <PlushiePhoto
          plushie={comment.plushie}
          sizes='40px'
          compact
          className='size-10 shrink-0 rounded-lg'
        />
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <RowLink
                href={`/plushies/${comment.plushie.slug}#comment-${comment.id}`}
              >
                {comment.plushie.name}
              </RowLink>
              <p className='text-sm text-muted-foreground'>
                {showAuthor && (
                  <>
                    <span className='relative'>
                      <CommentAuthor
                        author={comment.author}
                        link={viewer.admin}
                      />
                    </span>
                    {' · '}
                  </>
                )}
                <LocalTime iso={comment.createdAt} />
                {comment.editedAt && ' · edited'}
              </p>
            </div>
            <div className='relative flex shrink-0 gap-1'>
              <DeleteCommentButton
                comment={{
                  id: comment.id,
                  authorName: comment.author?.name ?? null,
                  replies: comment.replies,
                }}
                own={comment.author?.id === viewer.id}
                canPurge={viewer.admin}
              />
              <ItemMenuButton size='icon-sm' />
            </div>
          </div>
          {comment.replyTo && (
            <p className='relative truncate border-l-2 border-foreground/15 pl-2 text-sm text-muted-foreground'>
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
          <p className='relative text-sm wrap-break-word whitespace-pre-line'>
            {comment.body}
          </p>
        </div>
      </CommentMenu>
    </Reveal>
  );
}
