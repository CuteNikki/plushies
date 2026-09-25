'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { BanIcon, CheckIcon, Loader2Icon, Trash2Icon } from 'lucide-react';

import { banCommentAuthor, keepComment } from '@/actions/reports';

import { BanDialog } from '@/components/ban-controls';
import { useDeleteComment } from '@/components/delete-comment-button';
import { Button } from '@/components/ui/button';

/**
 * What to do about a reported comment: keep it, which shows it again if it
 * was hidden, or delete it. Either closes its reports. Its author can be
 * banned as well, when `canBan`.
 */
export function ReportActions({
  comment,
  author,
  viewer,
  canBan,
}: {
  comment: { id: string; replies: number };
  author: { id: string; name: string } | null;
  viewer: { id: string; admin: boolean };
  canBan: boolean;
}) {
  const router = useRouter();
  const [keeping, startKeep] = useTransition();
  const [banOpen, setBanOpen] = useState(false);
  const [remove, deleting, confirmDialog] = useDeleteComment({
    comment: {
      id: comment.id,
      authorName: author?.name ?? null,
      replies: comment.replies,
    },
    own: author?.id === viewer.id,
    canPurge: viewer.admin,
  });
  const busy = keeping || deleting;

  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        variant='default'
        size='sm'
        disabled={busy}
        onClick={() =>
          startKeep(async () => {
            const result = await keepComment(comment.id);
            if (!result.ok) return void toast.error(result.error);
            toast.success('Comment kept');
            router.refresh();
          })
        }
      >
        {keeping ? <Loader2Icon className='animate-spin' /> : <CheckIcon />}
        Keep
      </Button>
      <Button
        variant='destructive'
        size='sm'
        disabled={busy}
        onClick={remove}
      >
        {deleting ? <Loader2Icon className='animate-spin' /> : <Trash2Icon />}
        Delete
      </Button>
      {canBan && author && (
        <>
          <Button
            variant='destructive'
            size='sm'
            disabled={busy}
            onClick={() => setBanOpen(true)}
          >
            <BanIcon />
            Ban {author.name}
          </Button>
          <BanDialog
            user={author}
            open={banOpen}
            banAction={(input) => banCommentAuthor(comment.id, input)}
            onOpenChangeAction={setBanOpen}
          />
        </>
      )}
      {confirmDialog}
    </div>
  );
}
