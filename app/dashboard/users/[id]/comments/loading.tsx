import {
  CommentRowsSkeleton,
  HeadingSkeleton,
  LoadingPage,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserCommentsLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to their page. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Demo User’s comments'
        subtitle='12 comments, newest first.'
      />
      <CommentRowsSkeleton rows={4} />
    </LoadingPage>
  );
}
