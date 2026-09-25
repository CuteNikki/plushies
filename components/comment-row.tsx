import Link from 'next/link';

import { EyeOffIcon, FlagIcon } from 'lucide-react';

import type { CommentRowData } from '@/data/comment-rows';
import { count } from '@/lib/utils';

import { CommentAuthor } from '@/components/comment-author';
import { CommentMenu } from '@/components/comment-menu';
import { DeleteCommentButton } from '@/components/delete-comment-button';
import { ItemMenuButton } from '@/components/item-menu';
import { LocalTime } from '@/components/local-time';
import { Reveal } from '@/components/motion';
import { PlushieThumb } from '@/components/plushie-thumb';
import { RowLink } from '@/components/row-link';
import { Badge } from '@/components/ui/badge';

/**
 * A comment in the dashboard: which plushie it's on, who wrote it and when,
 * what it answers, whether it's reported or hidden, and a way to delete it.
 * Without `showAuthor` on pages where they're all by the same person.
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
        <PlushieThumb
          plushie={comment.plushie}
          sizes='40px'
          className='size-10 rounded-lg'
        />
        <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <RowLink
                href={`/plushies/${comment.plushie.slug}#comment-${comment.id}`}
              >
                {comment.plushie.name}
              </RowLink>
              <div className='flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground'>
                <p>
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
                {comment.hidden && (
                  <Badge
                    variant='destructive'
                    title='Hidden until it’s reviewed'
                  >
                    <EyeOffIcon />
                    Hidden
                  </Badge>
                )}
                {comment.openReports > 0 && (
                  <Badge variant='outline' className='relative' asChild>
                    <Link href='/dashboard/reports?show=comments'>
                      <FlagIcon />
                      {count(comment.openReports, 'report')}
                    </Link>
                  </Badge>
                )}
              </div>
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
