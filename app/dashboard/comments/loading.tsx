import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  TextLinesSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function CommentsLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Comments'
        subtitle='12 comments on the plushies’ pages, newest first.'
      />
      <ListSkeleton rows={4} rowClassName='flex items-start gap-3 p-4'>
        <Skeleton className='size-10 shrink-0 rounded-lg' />
        <TextLinesSkeleton />
        <Skeleton className='h-7 w-18 shrink-0' />
      </ListSkeleton>
    </LoadingPage>
  );
}
