import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  TextLinesSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function PlushiesLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <HeadingSkeleton
          title='Edit Plushies'
          subtitle='Add new friends or update the ones you have.'
        />
        <Skeleton className='h-7 w-26' />
      </div>
      {/* The view tabs: All, Recently edited, Needs attention. */}
      <Skeleton className='h-9 w-80 max-w-full rounded-lg' />
      <ListSkeleton rows={3}>
        <Skeleton className='size-14 shrink-0 rounded-xl' />
        <TextLinesSkeleton />
        <Skeleton className='h-6 w-14' />
      </ListSkeleton>
    </LoadingPage>
  );
}
