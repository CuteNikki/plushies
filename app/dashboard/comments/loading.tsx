import {
  CommentRowsSkeleton,
  HeadingSkeleton,
  ListControlsSkeleton,
  LoadingPage,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function CommentsLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Comments'
        subtitle='95 comments on the plushies’ pages.'
      />
      {/* Search, the order, and which comments. */}
      <ListControlsSkeleton selects={2} />
      <CommentRowsSkeleton rows={4} />
    </LoadingPage>
  );
}
