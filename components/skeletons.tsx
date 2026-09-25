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

/**
 * Known text, like a heading, hidden behind a placeholder so it takes the
 * same width and wraps like the real text. Pass the real element's text
 * classes.
 */
export function TextSkeleton({
  as: Tag = 'p',
  className,
  children,
}: {
  as?: 'p' | 'div';
  className?: string;
  children: string;
}) {
  // Each line gets rounded ends, which turns off text-pretty in Chromium, so
  // keep the last two words together like text-pretty would.
  const text = className?.includes('text-pretty')
    ? children.replace(/ (\S+)$/, '\u00a0$1')
    : children;
  return (
    <Tag aria-hidden className={cn('select-none', className)}>
      <span className='animate-pulse box-decoration-clone text-skeleton'>
        {text}
      </span>
    </Tag>
  );
}

/** A page title with an optional line of text under it. */
export function HeadingSkeleton({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <TextSkeleton className='font-heading text-4xl font-semibold tracking-tight'>
        {title}
      </TextSkeleton>
      {subtitle && (
        <TextSkeleton className='text-pretty'>{subtitle}</TextSkeleton>
      )}
    </div>
  );
}

/** A section title with an optional line of description under it. */
export function SectionHeadingSkeleton({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <TextSkeleton className='font-heading text-xl font-semibold'>
        {title}
      </TextSkeleton>
      {description && (
        <TextSkeleton className='text-sm text-pretty'>
          {description}
        </TextSkeleton>
      )}
    </div>
  );
}

/** A bordered list like the dashboard's, with `rows` placeholder rows. */
export function ListSkeleton({
  rows = 4,
  rowClassName = 'flex items-center gap-4 p-3',
  children,
}: {
  rows?: number;
  /** The real list's row layout, so the placeholders line up with it. */
  rowClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={rowClassName}>
          {children}
        </li>
      ))}
    </ul>
  );
}

/** Two lines of text, like a name with details under it. */
export function TextLinesSkeleton() {
  return (
    <div className='flex min-w-0 flex-1 flex-col gap-2'>
      <Skeleton className='h-5 w-40 max-w-full' />
      <Skeleton className='h-4 w-56 max-w-full' />
    </div>
  );
}

/**
 * The search box and dropdowns above a list, like ListControls. Both are
 * as tall as the real ones.
 */
export function ListControlsSkeleton({
  search = true,
  selects = 0,
}: {
  search?: boolean;
  selects?: number;
}) {
  return (
    <div className='flex flex-wrap gap-2'>
      {search && <Skeleton className='h-7 min-w-48 flex-1' />}
      {Array.from({ length: selects }, (_, index) => (
        <Skeleton key={index} className='h-7 w-36' />
      ))}
    </div>
  );
}

/**
 * Comments like CommentRow shows them: the plushie's photo and name, who
 * wrote it and when, the text, and the Delete button.
 */
export function CommentRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ListSkeleton rows={rows} rowClassName='flex items-start gap-3 p-4'>
      <Skeleton className='size-10 shrink-0 rounded-lg' />
      <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex min-w-0 flex-col gap-1.5'>
            <Skeleton className='my-0.5 h-5 w-24 max-w-full' />
            <Skeleton className='my-0.5 h-4 w-36 max-w-full' />
          </div>
          <Skeleton className='h-6 w-18 shrink-0' />
        </div>
        <Skeleton className='my-0.5 h-4 w-full max-w-md' />
      </div>
    </ListSkeleton>
  );
}

/** A section heading with a bordered box of `height` under it. */
export function SectionSkeleton({
  title,
  description,
  height,
}: {
  title: string;
  description?: string;
  height: string;
}) {
  return (
    <div className='flex flex-col gap-4'>
      <SectionHeadingSkeleton title={title} description={description} />
      <Skeleton className={cn('w-full rounded-xl', height)} />
    </div>
  );
}

/**
 * Matches AuthShell: the brand panel on wide screens and the form column,
 * with the page's heading above the card if it has one.
 */
export function AuthCardSkeleton({
  title,
  subtitle,
  height = 'h-72',
}: {
  title?: string;
  subtitle?: string;
  height?: string;
}) {
  return (
    <LoadingPage
      fill
      className='grid w-full flex-1 content-center items-center gap-16 py-8 lg:grid-cols-2'
    >
      <div className='hidden flex-col gap-10 justify-self-center lg:flex'>
        <Skeleton className='h-72 w-96 rounded-3xl' />
        <div className='flex flex-col gap-2'>
          <TextSkeleton className='font-heading text-5xl font-semibold'>
            Plushies
          </TextSkeleton>
          <TextSkeleton className='font-heading text-2xl font-medium'>
            Meet my soft friends
          </TextSkeleton>
          <TextSkeleton className='max-w-sm'>
            Names, birthdays, favorite things and photos, all in one cozy place.
          </TextSkeleton>
        </div>
      </div>
      <div className='mx-auto flex w-full max-w-sm flex-col gap-6'>
        {title && (
          <div className='flex flex-col gap-1 text-center'>
            <TextSkeleton className='font-heading text-3xl font-semibold'>
              {title}
            </TextSkeleton>
            {subtitle && (
              <TextSkeleton className='text-sm text-pretty'>
                {subtitle}
              </TextSkeleton>
            )}
          </div>
        )}
        <Skeleton className={cn('w-full rounded-2xl', height)} />
      </div>
    </LoadingPage>
  );
}
