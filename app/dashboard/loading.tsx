import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  TextLinesSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
  return (
    <LoadingPage className='gap-6'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <HeadingSkeleton />
        <Skeleton className='h-7 w-32' />
      </div>
      <ListSkeleton rows={4}>
        <Skeleton className='size-14 shrink-0 rounded-xl' />
        <TextLinesSkeleton />
        <Skeleton className='h-6 w-16' />
      </ListSkeleton>
    </LoadingPage>
  );
}
