'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  BanIcon,
  CheckIcon,
  ImageOffIcon,
  Loader2Icon,
  RotateCcwIcon,
} from 'lucide-react';

import {
  banReportedUser,
  dismissUserReports,
  resetReportedUser,
} from '@/actions/reports';
import { UserReportReason } from '@/lib/generated/prisma/enums';

import { BanDialog } from '@/components/ban-controls';
import { useConfirm } from '@/components/confirm-dialog';
import { Button } from '@/components/ui/button';

/**
 * What to do about a reported account: nothing, reset its name or picture,
 * or ban it. Each closes its reports. Resetting the name or picture only
 * when someone reported that. Only Dismiss unless `canAct`: editors can't
 * act on editors, and no one on admins.
 */
export function UserReportActions({
  user,
  reasons,
  canAct,
}: {
  user: { id: string; name: string; image: string | null; banned: boolean };
  /** Why the open reports say they reported them. */
  reasons: UserReportReason[];
  canAct: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [doing, setDoing] = useState<string | null>(null);
  const [banOpen, setBanOpen] = useState(false);
  const [ask, confirmDialog] = useConfirm();

  function run(
    key: string,
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success: string
  ) {
    setDoing(key);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(success);
        router.refresh();
      }
    });
  }

  const spinner = (key: string, icon: React.ReactNode) =>
    pending && doing === key ? <Loader2Icon className='animate-spin' /> : icon;

  return (
    <div className='flex flex-wrap gap-2'>
      <Button
        variant='default'
        size='sm'
        disabled={pending}
        onClick={() =>
          run('dismiss', () => dismissUserReports(user.id), 'Reports dismissed')
        }
      >
        {spinner('dismiss', <CheckIcon />)}
        Dismiss
      </Button>
      {canAct && (
        <>
          {reasons.includes(UserReportReason.NAME) && (
            <Button
              variant='destructive'
              size='sm'
              disabled={pending}
              onClick={async () => {
                const confirmed = await ask({
                  title: `Reset ${user.name}’s name?`,
                  description:
                    'They get a neutral name like “Plushie friend 1234”, and their account page asks them to pick a new one.',
                  action: 'Reset name',
                });
                if (!confirmed) return;
                run(
                  'name',
                  () => resetReportedUser(user.id, 'name'),
                  `${user.name}’s name was reset`
                );
              }}
            >
              {spinner('name', <RotateCcwIcon />)}
              Reset name
            </Button>
          )}
          {user.image && reasons.includes(UserReportReason.PICTURE) && (
            <Button
              variant='destructive'
              size='sm'
              disabled={pending}
              onClick={async () => {
                const confirmed = await ask({
                  title: `Remove ${user.name}’s picture?`,
                  description: 'They show with their initial instead.',
                  action: 'Remove picture',
                });
                if (!confirmed) return;
                run(
                  'picture',
                  () => resetReportedUser(user.id, 'picture'),
                  `${user.name}’s picture was removed`
                );
              }}
            >
              {spinner('picture', <ImageOffIcon />)}
              Remove picture
            </Button>
          )}
          {!user.banned && (
            <>
              <Button
                variant='destructive'
                size='sm'
                disabled={pending}
                onClick={() => setBanOpen(true)}
              >
                <BanIcon />
                Ban {user.name}
              </Button>
              <BanDialog
                user={user}
                open={banOpen}
                banAction={(input) => banReportedUser(user.id, input)}
                onOpenChangeAction={setBanOpen}
              />
            </>
          )}
        </>
      )}
      {confirmDialog}
    </div>
  );
}
