'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { EyeIcon, LinkIcon, PencilIcon, Trash2Icon } from 'lucide-react';

import { deletePlushie } from '@/actions/plushies';

import { useConfirm, type ConfirmOptions } from '@/components/confirm-dialog';
import {
  ItemMenu,
  ItemMenuItem,
  ItemMenuSeparator,
} from '@/components/item-menu';

/** Asked before deleting a plushie, here and on its edit page. */
export function deletePlushieConfirm(name: string): ConfirmOptions {
  return {
    title: `Delete ${name}?`,
    description:
      'This also deletes their photos and comments. You can restore them and their photos from the activity page for 30 days, but not their comments.',
    action: 'Delete',
    destructive: true,
  };
}

/** A plushie's row, with its actions on right-click and an ItemMenuButton. */
export function PlushieMenu({
  plushie,
  className,
  children,
}: {
  plushie: { id: string; slug: string; name: string };
  className?: string;
  children?: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [ask, confirmDialog] = useConfirm();
  const page = `/plushies/${plushie.slug}`;

  return (
    <>
      <ItemMenu
        label={`Actions for ${plushie.name}`}
        disabled={pending}
        className={className}
        items={
          <>
            <ItemMenuItem icon={EyeIcon} href={page}>
              View page
            </ItemMenuItem>
            <ItemMenuItem
              icon={PencilIcon}
              href={`/dashboard/plushies/${plushie.id}`}
            >
              Edit
            </ItemMenuItem>
            <ItemMenuItem
              icon={LinkIcon}
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(
                    new URL(page, location.origin).href
                  );
                  toast.success('Link copied');
                } catch {
                  toast.error('Couldn’t copy the link');
                }
              }}
            >
              Copy link
            </ItemMenuItem>
            <ItemMenuSeparator />
            <ItemMenuItem
              icon={Trash2Icon}
              variant='destructive'
              onSelect={async () => {
                if (!(await ask(deletePlushieConfirm(plushie.name)))) return;
                startTransition(async () => {
                  try {
                    await deletePlushie(plushie.id);
                    toast.success(`${plushie.name} was deleted`);
                  } catch {
                    toast.error('Something went wrong, try again');
                  }
                });
              }}
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
