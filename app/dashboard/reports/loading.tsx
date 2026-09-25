import {
  CommentRowsSkeleton,
  HeadingSkeleton,
  LoadingPage,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Reports'
        subtitle='2 reported comments to look at.'
      />
      <CommentRowsSkeleton rows={2} />
    </LoadingPage>
  );
}
