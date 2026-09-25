import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  TextLinesSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserActivityLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to their page. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Demo User’s activity'
        subtitle='Changes to this account and changes they made, from the last 90 days.'
      />
      <ListSkeleton rows={4} rowClassName='flex items-start gap-3 p-4'>
        <Skeleton className='size-8 shrink-0' />
        <TextLinesSkeleton />
      </ListSkeleton>
    </LoadingPage>
  );
}
