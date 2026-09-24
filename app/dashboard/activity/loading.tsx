import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  TextLinesSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function ActivityLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Activity'
        subtitle='Changes to plushies and accounts from the last 90 days.'
      />
      {/* All, Plushies and Users, for admins. */}
      <div className='flex gap-1'>
        <Skeleton className='h-6 w-9' />
        <Skeleton className='h-6 w-16' />
        <Skeleton className='h-6 w-12' />
      </div>
      <ListSkeleton rows={4} rowClassName='flex items-start gap-3 p-4'>
        <Skeleton className='size-8 shrink-0' />
        <TextLinesSkeleton />
      </ListSkeleton>
    </LoadingPage>
  );
}
