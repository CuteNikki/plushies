'use client';

import { useCallback, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type ConfirmOptions = {
  title: string;
  description?: string;
  /** The confirm button's text, e.g. 'Delete'. */
  action: string;
  /** For changes that are hard to undo: a red confirm button. */
  destructive?: boolean;
};

type Pending = ConfirmOptions & { resolve: (confirmed: boolean) => void };

/**
 * Asks before doing something, in a dialog rather than the browser's own
 * prompt. `confirm` resolves to whether they went ahead; render `dialog`
 * somewhere in the component, outside any menu that opens it.
 *
 *   const [confirm, dialog] = useConfirm();
 *   if (!(await confirm({ title: 'Delete Mochi?', action: 'Delete' }))) return;
 */
export function useConfirm() {
  // Kept after closing, so the text stays while the dialog animates out.
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setPending({ ...options, resolve });
        setOpen(true);
      }),
    []
  );

  // Resolving twice does nothing, so closing after confirming stays a yes.
  function settle(confirmed: boolean) {
    pending?.resolve(confirmed);
    setOpen(false);
  }

  const dialog = (
    <AlertDialog
      open={open}
      // Escape, the overlay and Cancel all count as no.
      onOpenChange={(open) => !open && settle(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{pending?.title}</AlertDialogTitle>
          {pending?.description && (
            <AlertDialogDescription>
              {pending.description}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={pending?.destructive ? 'destructive' : 'default'}
            onClick={() => settle(true)}
          >
            {pending?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog] as const;
}
