import { cn } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholders shaped like the real pages, so nothing jumps when
 * the content arrives. Used by the loading.tsx files.
 */
export function LoadingPage({
  className,
  fill,
  children,
}: {
  className?: string;
  /** Fill the space between header and footer, like centered pages do. */
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn('flex flex-col', className)}
      data-fill={fill || undefined}
      aria-busy
    >
      <span className='sr-only' role='status'>
        Loading…
      </span>
      {children}
    </div>
  );
}

/** A page title with an optional line of text under it. */
export function HeadingSkeleton({
  width = 'w-64',
  subtitle = true,
}: {
  width?: string;
  subtitle?: boolean;
}) {
  return (
    <div className='flex flex-col gap-2'>
      <Skeleton className={cn('h-10 max-w-full', width)} />
      {subtitle && <Skeleton className='h-5 w-80 max-w-full' />}
    </div>
  );
}

/** A bordered list like the dashboard's, with `rows` placeholder rows. */
export function ListSkeleton({
  rows = 4,
  children,
}: {
  rows?: number;
  children: React.ReactNode;
}) {
  return (
    <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className='flex items-center gap-4 p-3 px-4'>
          {children}
        </li>
      ))}
    </ul>
  );
}

/** Two lines of text, like a name with details under it. */
export function TextLinesSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-2'>
      <Skeleton className='h-5 w-40 max-w-full' />
      <Skeleton className='h-4 w-56 max-w-full' />
    </div>
  );
}

/** A section heading with a bordered box of `height` under it. */
export function SectionSkeleton({ height }: { height: string }) {
  return (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-7 w-40' />
      <Skeleton className={cn('w-full rounded-xl', height)} />
    </div>
  );
}

/** Matches AuthShell: the brand panel on wide screens and the form column. */
export function AuthCardSkeleton({ height = 'h-72' }: { height?: string }) {
  return (
    <LoadingPage
      fill
      className='grid w-full flex-1 content-center items-center gap-16 py-8 lg:grid-cols-2'
    >
      <div className='hidden flex-col gap-10 justify-self-center lg:flex'>
        <Skeleton className='h-72 w-96 rounded-3xl' />
        <div className='flex flex-col gap-3'>
          <Skeleton className='h-12 w-48' />
          <Skeleton className='h-7 w-64' />
          <Skeleton className='h-5 w-80' />
        </div>
      </div>
      <div className='mx-auto flex w-full max-w-sm flex-col items-center gap-6'>
        <Skeleton className='h-9 w-48' />
        <Skeleton className={cn('w-full rounded-2xl', height)} />
      </div>
    </LoadingPage>
  );
}
