'use client';

import { toast } from 'sonner';

import {
  CopyIcon,
  MessageCircleIcon,
  Trash2Icon,
  UserIcon,
} from 'lucide-react';

import type { CommentRowData } from '@/data/comment-rows';
import { mentionsToText } from '@/lib/mentions';

import { useDeleteComment } from '@/components/delete-comment-button';
import {
  ItemMenu,
  ItemMenuItem,
  ItemMenuSeparator,
} from '@/components/item-menu';

/** A comment's row, with its actions on right-click and an ItemMenuButton. */
export function CommentMenu({
  comment,
  viewer,
  className,
  children,
}: {
  comment: Pick<
    CommentRowData,
    'id' | 'body' | 'author' | 'plushie' | 'replies'
  >;
  viewer: { id: string; admin: boolean };
  className?: string;
  children: React.ReactNode;
}) {
  const [remove, deleting, confirmDialog] = useDeleteComment({
    comment: {
      id: comment.id,
      authorName: comment.author?.name ?? null,
      replies: comment.replies,
    },
    own: comment.author?.id === viewer.id,
    canPurge: viewer.admin,
  });

  return (
    <>
      <ItemMenu
        label='Comment actions'
        disabled={deleting}
        className={className}
        items={
          <>
            <ItemMenuItem
              icon={MessageCircleIcon}
              href={`/plushies/${comment.plushie.slug}#comment-${comment.id}`}
            >
              View on {comment.plushie.name}’s page
            </ItemMenuItem>
            {/* Admins can see who wrote it, like the name's link. */}
            {viewer.admin && comment.author && (
              <ItemMenuItem
                icon={UserIcon}
                href={`/dashboard/users/${comment.author.id}`}
              >
                View {comment.author.name}
              </ItemMenuItem>
            )}
            <ItemMenuItem
              icon={CopyIcon}
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(
                    mentionsToText(comment.body)
                  );
                  toast.success('Comment copied');
                } catch {
                  toast.error('Couldn’t copy the comment');
                }
              }}
            >
              Copy text
            </ItemMenuItem>
            <ItemMenuSeparator />
            <ItemMenuItem
              icon={Trash2Icon}
              variant='destructive'
              onSelect={remove}
            >
              Delete
            </ItemMenuItem>
          </>
        }
      >
        {children}
      </ItemMenu>
      {confirmDialog}
    </>
  );
}
