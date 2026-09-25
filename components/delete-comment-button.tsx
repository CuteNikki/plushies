'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Loader2Icon, Trash2Icon } from 'lucide-react';

import { deleteComment } from '@/actions/comments';

import { useConfirm } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

type DeleteCommentProps = {
  comment: { id: string; authorName: string | null; replies: number };
  own: boolean;
  canPurge: boolean;
};

/**
 * Deletes a comment from the dashboard's comments page, after asking, the
 * way it's done on the plushie's page. Admins can erase its replies with it.
 */
export function DeleteCommentButton(props: DeleteCommentProps) {
  const [remove, deleting, confirmDialog] = useDeleteComment(props);

  return (
    <>
      <Button
        variant='outline'
        size='sm'
        className='shrink-0 hover:border-destructive/40 hover:text-destructive'
        disabled={deleting}
        onClick={remove}
      >
        {deleting ? <Loader2Icon className='animate-spin' /> : <Trash2Icon />}
        Delete
      </Button>
      {confirmDialog}
    </>
  );
}

/** Asks, then deletes; render `dialog` outside any menu that calls `remove`. */
export function useDeleteComment({
  comment,
  own,
  canPurge,
}: DeleteCommentProps) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [ask, confirmDialog] = useConfirm();

  async function remove() {
    const logged = 'It’s logged in the activity, where it can be restored.';
    const confirmed = await ask({
      title: own
        ? 'Delete your comment?'
        : `Delete ${comment.authorName ?? 'this'}’s comment?`,
      description: !own
        ? logged
        : comment.replies > 0
          ? 'The replies to it stay, under “Comment deleted”.'
          : 'This can’t be undone.',
      action: 'Delete',
      destructive: true,
      option:
        canPurge && comment.replies > 0
          ? {
              label: 'Erase completely',
              destructive: true,
              description: `Also deletes every reply under it, without leaving “Comment deleted”. ${logged}`,
            }
          : undefined,
    });
    if (!confirmed) return;
    startDelete(async () => {
      const result = await deleteComment(comment.id, {
        withReplies: confirmed.option,
      });
      if (!result.ok) return void toast.error(result.error);
      toast.success('Comment deleted');
      router.refresh();
    });
  }

  return [remove, deleting, confirmDialog] as const;
}
