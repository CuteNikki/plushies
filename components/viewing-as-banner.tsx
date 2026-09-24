'use client';

import { useTransition } from 'react';

import { EyeIcon, Loader2Icon } from 'lucide-react';

import { stopViewingAs } from '@/actions/users';
import { authClient } from '@/lib/auth-client';
import { isRole, roleLabels } from '@/lib/permissions';

import { Button } from '@/components/ui/button';

/** Shown on every page while an admin views the site as someone else. */
export function ViewingAsBanner() {
  const { data } = authClient.useSession();
  const [pending, startTransition] = useTransition();
  if (!data?.session.impersonatedBy) return null;
  const role = isRole(data.user.role) ? roleLabels[data.user.role] : null;

  return (
    <div className='bg-primary text-sm text-primary-foreground'>
      <div className='mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2'>
        <p className='flex items-center gap-2 text-pretty'>
          <EyeIcon className='size-4 shrink-0' aria-hidden />
          <span>
            Viewing as <strong>{data.user.name}</strong>
            {role && <> ({role})</>}. Changes are turned off.
          </span>
        </p>
        <Button
          size='sm'
          variant='secondary'
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await stopViewingAs();
              // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A full reload, so every part of the page uses your session again.
              window.location.href = '/dashboard/users';
            })
          }
        >
          {pending && <Loader2Icon className='animate-spin' />}
          Stop viewing
        </Button>
      </div>
    </div>
  );
}
