'use client';

import { useRouter } from 'next/navigation';
import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { BanIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react';

import { banUser, unbanUser } from '@/actions/users';
import {
  BAN_REASON_MAX,
  banDurations,
  type BanDuration,
} from '@/lib/ban-options';

import { useConfirm, type ConfirmOptions } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type BanUser = { id: string; name: string };

/**
 * Bans someone. They see the reason, if one is given, when they try to sign
 * in. Asks first unless `confirmed`, e.g. inside a dialog that already did.
 */
export function BanForm({
  user,
  confirmed,
  onDoneAction,
}: {
  user: BanUser;
  confirmed?: boolean;
  /** Called once they're banned. */
  onDoneAction?: () => void;
}) {
  const router = useRouter();
  const id = useId();
  const [duration, setDuration] = useState<BanDuration>('7');
  const [pending, startTransition] = useTransition();
  const [ask, confirmDialog] = useConfirm();

  async function handleSubmit(formData: FormData) {
    const reason = String(formData.get('reason')).trim();
    const how =
      duration === 'permanent'
        ? 'until you lift it'
        : `for ${banDurations[duration]}`;
    if (
      !confirmed &&
      !(await ask({
        title: `Ban ${user.name} ${how}?`,
        description: 'They’re signed out everywhere right away.',
        action: 'Ban',
        destructive: true,
      }))
    ) {
      return;
    }
    startTransition(async () => {
      const { error } = await banUser(user.id, { reason, duration });
      if (error) return void toast.error(error);
      toast.success(`${user.name} is banned`);
      onDoneAction?.();
      router.refresh();
    });
  }

  return (
    // onSubmit rather than action: an action clears the form afterwards,
    // which would lose the reason if they cancel or it fails.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(new FormData(event.currentTarget));
      }}
      className='flex flex-col gap-3'
    >
      <div className='flex flex-col gap-1'>
        <Label htmlFor={`${id}-reason`}>Reason</Label>
        <Textarea
          id={`${id}-reason`}
          name='reason'
          maxLength={BAN_REASON_MAX}
          placeholder='They see this when they try to sign in.'
        />
      </div>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor={`${id}-duration`}>How long</Label>
          <Select
            value={duration}
            onValueChange={(value) => setDuration(value as BanDuration)}
          >
            <SelectTrigger id={`${id}-duration`} className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(banDurations).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type='submit' variant='destructive' disabled={pending}>
          {pending ? <Loader2Icon className='animate-spin' /> : <BanIcon />}
          Ban {user.name}
        </Button>
      </div>
      {confirmDialog}
    </form>
  );
}

/** The ban form in a dialog, e.g. opened from a menu. */
export function BanDialog({
  user,
  open,
  onOpenChangeAction,
}: {
  user: BanUser;
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ban {user.name}</DialogTitle>
          <DialogDescription>
            Signs them out everywhere and stops them signing in until the ban
            ends or you lift it.
          </DialogDescription>
        </DialogHeader>
        <BanForm
          user={user}
          confirmed
          onDoneAction={() => onOpenChangeAction(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Asks before lifting someone's ban, with `ask` from useConfirm. */
export function confirmLiftBan(
  user: BanUser,
  ask: (options: ConfirmOptions) => Promise<boolean>
) {
  return ask({
    title: `Lift ${user.name}’s ban?`,
    description: 'They can sign in again right away.',
    action: 'Lift ban',
  });
}

/** Lifts someone's ban. Returns whether it worked. */
export async function liftBan(user: BanUser) {
  const { error } = await unbanUser(user.id);
  if (error) {
    toast.error(error);
    return false;
  }
  toast.success(`${user.name} can sign in again`);
  return true;
}

/** Lifts someone's ban before it ends by itself, after asking. */
export function UnbanButton({ user }: { user: BanUser }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ask, confirmDialog] = useConfirm();

  return (
    <>
      <Button
        variant='outline'
        className='w-fit'
        disabled={pending}
        onClick={async () => {
          if (!(await confirmLiftBan(user, ask))) return;
          startTransition(async () => {
            if (await liftBan(user)) router.refresh();
          });
        }}
      >
        {pending ? (
          <Loader2Icon className='animate-spin' />
        ) : (
          <ShieldCheckIcon />
        )}
        Lift ban
      </Button>
      {confirmDialog}
    </>
  );
}
