'use client';

import { useCallback, useId, useState } from 'react';

import { cn } from '@/lib/utils';

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
import { Checkbox } from '@/components/ui/checkbox';

export type ConfirmOptions = {
  title: string;
  description?: string;
  /** The confirm button's text, e.g. 'Delete'. */
  action: string;
  /** For changes that are hard to undo: a red confirm button. */
  destructive?: boolean;
  /** An extra choice to tick, e.g. to also delete the replies. */
  option?: {
    label: string;
    description?: string;
    /** Makes things harder to undo: shown in red once ticked. */
    destructive?: boolean;
  };
};

/** False if they cancelled; otherwise whether they ticked the option. */
export type ConfirmResult = false | { option: boolean };

export type Confirm = (options: ConfirmOptions) => Promise<ConfirmResult>;

type Pending = ConfirmOptions & { resolve: (result: ConfirmResult) => void };

/**
 * Asks before doing something, in a dialog rather than the browser's own
 * prompt. `confirm` resolves to false if they cancelled, so it reads as a
 * yes or no; render `dialog` somewhere in the component, outside any menu
 * that opens it.
 *
 *   const [confirm, dialog] = useConfirm();
 *   if (!(await confirm({ title: 'Delete Mochi?', action: 'Delete' }))) return;
 */
export function useConfirm() {
  const optionId = useId();
  // Kept after closing, so the text stays while the dialog animates out.
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const [option, setOption] = useState(false);

  const confirm: Confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setPending({ ...options, resolve });
        setOption(false);
        setOpen(true);
      }),
    []
  );

  // Resolving twice does nothing, so closing after confirming stays a yes.
  function settle(result: ConfirmResult) {
    pending?.resolve(result);
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
        {pending?.option && (
          // The whole card toggles it, and it shows once it's ticked.
          <label
            htmlFor={optionId}
            data-destructive={pending.option.destructive || undefined}
            className='flex cursor-pointer items-start gap-3 rounded-xl p-3 ring-1 ring-foreground/10 transition-colors hover:bg-muted/50 has-data-checked:bg-primary/10 has-data-checked:ring-primary/40 data-destructive:has-data-checked:bg-destructive/10 data-destructive:has-data-checked:ring-destructive/40'
          >
            <Checkbox
              id={optionId}
              checked={option}
              onCheckedChange={(checked) => setOption(checked === true)}
              className={cn(
                'mt-0.5',
                pending.option.destructive &&
                  'data-checked:border-destructive data-checked:bg-destructive dark:data-checked:bg-destructive'
              )}
            />
            <span className='flex flex-col gap-0.5'>
              <span className='text-sm font-medium'>
                {pending.option.label}
              </span>
              {pending.option.description && (
                <span className='text-xs text-pretty text-muted-foreground'>
                  {pending.option.description}
                </span>
              )}
            </span>
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={pending?.destructive ? 'destructive' : 'default'}
            onClick={() => settle({ option })}
          >
            {pending?.action}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return [confirm, dialog] as const;
}
