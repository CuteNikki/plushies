'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import {
  ActivityIcon,
  HourglassIcon,
  LogInIcon,
  MapPinIcon,
  MonitorIcon,
  NetworkIcon,
  SmartphoneIcon,
  type LucideIcon,
} from 'lucide-react';

import { formatDate, relative } from '@/lib/time';
import { cn } from '@/lib/utils';

import { revokeOtherSessions, revokeSession } from '@/app/account/actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type SessionInfo = {
  id: string;
  device: string;
  ipAddress: string | null;
  /** e.g. 'Germany · Deutsche Telekom AG', when it could be looked up. */
  location: string | null;
  createdAt: string;
  lastActive: string;
  expiresAt: string;
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
    <div className='flex flex-col gap-2'>
      <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
        {sessions.map((session) => {
          const Icon = /iPhone|iPad|Android/.test(session.device)
            ? SmartphoneIcon
            : MonitorIcon;
          return (
            <li
              key={session.id}
              className='flex items-start gap-3 p-3 px-4 sm:gap-4'
            >
              <div className='flex min-w-0 flex-1 flex-col gap-1'>
                <p className='flex flex-wrap items-center gap-2 font-medium'>
                  <Icon className='size-5 shrink-0 text-muted-foreground' />
                  {session.device}
                  {session.current && <Badge size='sm'>This device</Badge>}
                </p>
                {/* Each detail wraps as a whole, so narrow screens get a clean
                    list instead of sentences broken mid-phrase. */}
                {(session.location || session.ipAddress) && (
                  <Details className='text-sm'>
                    {session.location && (
                      <Detail icon={MapPinIcon} label='Location'>
                        {session.location}
                      </Detail>
                    )}
                    {session.ipAddress && (
                      <Detail icon={NetworkIcon} label='IP address'>
                        {session.ipAddress}
                      </Detail>
                    )}
                  </Details>
                )}
                {/* Times are shown in the viewer's own time zone and relative
                    to now, so the server's render can differ slightly. */}
                <Details className='text-xs' suppressHydrationWarning>
                  <Detail icon={LogInIcon}>
                    Signed in {formatDate(session.createdAt)}
                  </Detail>
                  <Detail icon={ActivityIcon}>
                    Active {relative(session.lastActive)}
                  </Detail>
                  <Detail icon={HourglassIcon}>
                    Expires {relative(session.expiresAt)}
                  </Detail>
                </Details>
              </div>
              {!session.current && (
                <Button
                  variant='destructive'
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
      <div className='flex flex-col items-start justify-between gap-2 xs:flex-row'>
        {others.length > 0 && (
          <Button
            variant='destructive'
            size='lg'
            className='w-fit'
            disabled={pending}
            onClick={() =>
              run(revokeOtherSessions, 'Signed out on all other devices')
            }
          >
            Sign out all other devices
          </Button>
        )}
        {/* Required by the IPinfo Lite license. */}
        {sessions.some((session) => session.location) && (
          <p className='text-xs text-muted-foreground xs:ml-auto'>
            IP address data is powered by{' '}
            <a
              href='https://ipinfo.io'
              target='_blank'
              rel='noopener noreferrer'
              className='text-primary hover:underline'
            >
              IPinfo
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

function Details({
  className,
  children,
  suppressHydrationWarning,
}: {
  className?: string;
  children: React.ReactNode;
  suppressHydrationWarning?: boolean;
}) {
  return (
    <ul
      className={cn(
        'flex flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground',
        className
      )}
      suppressHydrationWarning={suppressHydrationWarning}
    >
      {children}
    </ul>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  /** Read out by screen readers when the icon alone says what this is. */
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <li className='flex min-w-0 items-center gap-1' suppressHydrationWarning>
      <Icon className='size-3.5 shrink-0 opacity-70' aria-hidden />
      {label && <span className='sr-only'>{label}: </span>}
      <span className='min-w-0 wrap-break-word'>{children}</span>
    </li>
  );
}
