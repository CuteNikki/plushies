'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { BanIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react';

import { banUser, unbanUser } from '@/actions/users';
import {
  BAN_REASON_MAX,
  banDurations,
  type BanDuration,
} from '@/lib/ban-options';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

/** Bans someone, after asking. They see the reason when they try to sign in. */
export function BanForm({ user }: { user: { id: string; name: string } }) {
  const router = useRouter();
  const [duration, setDuration] = useState<BanDuration>('7');
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const reason = String(formData.get('reason')).trim();
    const how =
      duration === 'permanent'
        ? 'until you lift it'
        : `for ${banDurations[duration]}`;
    if (
      !window.confirm(
        `Ban ${user.name} ${how}? They're signed out everywhere right away.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const { error } = await banUser(user.id, { reason, duration });
      if (error) return void toast.error(error);
      toast.success(`${user.name} is banned`);
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
        <Label htmlFor='ban-reason'>Reason</Label>
        <Textarea
          id='ban-reason'
          name='reason'
          required
          maxLength={BAN_REASON_MAX}
          placeholder='They see this when they try to sign in.'
        />
      </div>
      <div className='flex flex-wrap items-end gap-3'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='ban-duration'>How long</Label>
          <Select
            value={duration}
            onValueChange={(value) => setDuration(value as BanDuration)}
          >
            <SelectTrigger id='ban-duration' className='w-40'>
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
    </form>
  );
}

/** Lifts someone's ban before it ends by itself, after asking. */
export function UnbanButton({ user }: { user: { id: string; name: string } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant='outline'
      className='w-fit'
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Lift ${user.name}’s ban?`)) return;
        startTransition(async () => {
          const { error } = await unbanUser(user.id);
          if (error) return void toast.error(error);
          toast.success(`${user.name} can sign in again`);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2Icon className='animate-spin' /> : <ShieldCheckIcon />}
      Lift ban
    </Button>
  );
}
