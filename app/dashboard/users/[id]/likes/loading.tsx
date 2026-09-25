import { HeadingSkeleton, LoadingPage } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserLikesLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to their page. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Demo User’s likes'
        subtitle='12 plushies liked, the latest first.'
      />
      <div className='grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8'>
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className='aspect-square rounded-xl' />
        ))}
      </div>
    </LoadingPage>
  );
}
