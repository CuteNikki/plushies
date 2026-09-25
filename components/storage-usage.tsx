import { Suspense } from 'react';

import { CloudOffIcon } from 'lucide-react';

import { getStorageUsage } from '@/lib/uploads';
import { cn, count, formatBytes } from '@/lib/utils';

import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

/** How full UploadThing is, for the dashboard and the photos page. */
export function StorageUsage() {
  return (
    <Suspense fallback={<StorageSkeleton />}>
      <Usage />
    </Suspense>
  );
}

/**
 * Looked up from UploadThing on each visit. It streams in after the rest of
 * the page, so a slow answer doesn't hold up the dashboard.
 */
async function Usage() {
  const usage = await getStorageUsage().catch((error) => {
    console.error('Failed to load UploadThing usage', error);
    return null;
  });
  if (!usage) {
    return (
      <EmptyState icon={CloudOffIcon}>
        Couldn&rsquo;t load storage usage right now.
      </EmptyState>
    );
  }

  const share =
    usage.limitBytes > 0 ? Math.min(usage.usedBytes / usage.limitBytes, 1) : 0;
  const percent = Math.round(share * 100);
  const almostFull = share >= 0.9;

  return (
    <div className='flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10'>
      <div className='flex flex-wrap items-baseline justify-between gap-x-2'>
        <p className='font-semibold'>
          {formatBytes(usage.usedBytes)}{' '}
          <span className='font-normal text-muted-foreground'>
            of {formatBytes(usage.limitBytes)}
          </span>
        </p>
        <p
          className={cn(
            'text-sm',
            almostFull
              ? 'font-semibold text-destructive'
              : 'text-muted-foreground'
          )}
        >
          {almostFull ? `Almost full, ${percent}%` : `${percent}% used`}
        </p>
      </div>
      <div
        role='meter'
        aria-label='Photo storage used'
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={cn(
          'h-2.5 overflow-hidden rounded-full',
          almostFull ? 'bg-destructive/15' : 'bg-primary/15'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full',
            almostFull ? 'bg-destructive' : 'bg-primary'
          )}
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className='text-sm text-muted-foreground'>
        {count(usage.files, 'file')} uploaded
      </p>
    </div>
  );
}

export function StorageSkeleton() {
  return (
    <div className='flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10'>
      <Skeleton className='h-6 w-40' />
      <Skeleton className='h-2.5 w-full rounded-full' />
      <Skeleton className='h-5 w-28' />
    </div>
  );
}
