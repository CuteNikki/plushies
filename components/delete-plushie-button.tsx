'use client';

import { useTransition } from 'react';

import { Loader2Icon, Trash2Icon } from 'lucide-react';

import { deletePlushie } from '@/actions/plushies';
import { authClient } from '@/lib/auth-client';
import { canEditPlushies } from '@/lib/permissions';

import { useConfirm } from '@/components/confirm-dialog';
import { deletePlushieConfirm } from '@/components/plushie-menu';
import { Button } from '@/components/ui/button';

/**
 * Deletes a plushie from their page, after asking, like on the edit page.
 * Only for editors and admins.
 */
export function DeletePlushieButton({
  plushie,
}: {
  plushie: { id: string; name: string };
}) {
  const { data: session } = authClient.useSession();
  const [deleting, startDelete] = useTransition();
  const [ask, confirmDialog] = useConfirm();
  if (!canEditPlushies(session?.user.role)) return null;

  return (
    <>
      <Button
        variant='destructive'
        size='sm'
        disabled={deleting}
        onClick={async () => {
          if (!(await ask(deletePlushieConfirm(plushie.name)))) return;
          startDelete(() => deletePlushie(plushie.id, { backToList: true }));
        }}
      >
        {deleting ? <Loader2Icon className='animate-spin' /> : <Trash2Icon />}
        Delete
      </Button>
      {confirmDialog}
    </>
  );
}
