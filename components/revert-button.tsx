'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { Loader2Icon, Undo2Icon } from 'lucide-react';

import { revertActivity } from '@/actions/activity';

import { Button } from '@/components/ui/button';

/** Undoes the change an activity entry recorded, after asking. */
export function RevertButton({
  id,
  label,
  confirm,
}: {
  id: string;
  label: string;
  confirm: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant='destructive'
      size='sm'
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirm)) return;
        startTransition(async () => {
          const { error } = await revertActivity(id);
          if (error) return void toast.error(error);
          toast.success('Reverted');
          router.refresh();
        });
      }}
    >
      {label}
      {pending ? <Loader2Icon className='animate-spin' /> : <Undo2Icon />}
    </Button>
  );
}
