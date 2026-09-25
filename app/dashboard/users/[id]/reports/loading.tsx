import { HeadingSkeleton, LoadingPage } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserReportsLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to their page. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Reports and Demo User'
        subtitle='Open and closed, the latest first. Open ones are dealt with on the reports page.'
      />
      {/* About them, and sent by them. */}
      <Skeleton className='h-9 w-64 rounded-lg' />
      {Array.from({ length: 2 }, (_, index) => (
        <Skeleton key={index} className='h-64 rounded-xl' />
      ))}
    </LoadingPage>
  );
}
