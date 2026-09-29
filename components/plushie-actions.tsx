'use client';

import Link from 'next/link';
import { useTransition } from 'react';

import {
  CopyPlusIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';

import { deletePlushie } from '@/actions/plushies';
import { authClient } from '@/lib/auth-client';
import { canEditPlushies, isViewingAs } from '@/lib/permissions';

import { useConfirm } from '@/components/confirm-dialog';
import { deletePlushieConfirm } from '@/components/plushie-menu';
import { Button } from '@/components/ui/button';

/** Whether this visitor can change plushies right now. */
function useCanEdit() {
  const { data } = authClient.useSession();
  return canEditPlushies(data?.user.role) && !isViewingAs(data ?? null);
}

/** Their labels hide on phones, where the icons are enough. */
function Label({ children }: { children: React.ReactNode }) {
  return <span className='max-sm:sr-only'>{children}</span>;
}

/** Adds a plushie, from the home page. Only for editors and admins. */
export function NewPlushieButton() {
  if (!useCanEdit()) return null;

  return (
    <Button size='sm' asChild>
      <Link href='/dashboard/plushies/new'>
        <PlusIcon />
        New Plushie
      </Link>
    </Button>
  );
}

/**
 * What editors and admins can do from a plushie's page: edit, duplicate or
 * delete them, and add another. Deleting asks first, like on the edit page.
 */
export function PlushieActions({
  plushie,
}: {
  plushie: { id: string; name: string };
}) {
  const [deleting, startDelete] = useTransition();
  const [ask, confirmDialog] = useConfirm();
  if (!useCanEdit()) return null;

  return (
    <>
      <Button variant='outline' size='sm' asChild>
        <Link href={`/dashboard/plushies/${plushie.id}`}>
          <PencilIcon />
          Edit
        </Link>
      </Button>
      <Button variant='outline' size='sm' asChild>
        <Link
          href={`/dashboard/plushies/new?from=${plushie.id}`}
          aria-label={`Duplicate ${plushie.name}`}
        >
          <CopyPlusIcon />
          <Label>Duplicate</Label>
        </Link>
      </Button>
      <Button variant='outline' size='sm' asChild>
        <Link href='/dashboard/plushies/new' aria-label='New plushie'>
          <PlusIcon />
          <Label>New</Label>
        </Link>
      </Button>
      <Button
        variant='destructive'
        size='sm'
        disabled={deleting}
        aria-label={`Delete ${plushie.name}`}
        onClick={async () => {
          if (!(await ask(deletePlushieConfirm(plushie.name)))) return;
          startDelete(() => deletePlushie(plushie.id, { backToList: true }));
        }}
      >
        {deleting ? <Loader2Icon className='animate-spin' /> : <Trash2Icon />}
        <Label>Delete</Label>
      </Button>
      {confirmDialog}
    </>
  );
}
