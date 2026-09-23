'use client';

import { Monitor, Smartphone } from 'lucide-react';
import { useTransition } from 'react';
import { toast } from 'sonner';

import { revokeOtherSessions, revokeSession } from '@/app/account/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SessionInfo = {
  id: string;
  device: string;
  ipAddress: string | null;
  lastActive: string;
  current: boolean;
};

export function SessionList({ sessions }: { sessions: SessionInfo[] }) {
  const [pending, startTransition] = useTransition();
  const others = sessions.filter((session) => !session.current);

  function run(action: () => Promise<{ error?: string }>, success: string) {
    startTransition(async () => {
      const { error } = await action();
      if (error) toast.error(error);
      else toast.success(success);
    });
  }

  return (
    <div className='flex flex-col gap-3'>
      <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
        {sessions.map((session) => {
          const Icon = /iPhone|iPad|Android/.test(session.device)
            ? Smartphone
            : Monitor;
          return (
            <li key={session.id} className='flex items-center gap-3 p-3 px-4'>
              <Icon className='size-5 shrink-0 text-muted-foreground' />
              <div className='min-w-0 flex-1'>
                <p className='flex items-center gap-1.5 font-medium'>
                  {session.device}
                  {session.current && <Badge>This device</Badge>}
                </p>
                <p className='truncate text-sm text-muted-foreground'>
                  {[session.ipAddress, `active ${timeAgo(session.lastActive)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {!session.current && (
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={pending}
                  onClick={() =>
                    run(() => revokeSession(session.id), 'Signed out')
                  }
                >
                  Sign out
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {others.length > 0 && (
        <Button
          variant='outline'
          size='sm'
          className='w-fit'
          disabled={pending}
          onClick={() =>
            run(revokeOtherSessions, 'Signed out on all other devices')
          }
        >
          Sign out all other devices
        </Button>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
