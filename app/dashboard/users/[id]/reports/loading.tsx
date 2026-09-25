import {
  HeadingSkeleton,
  LoadingPage,
  ReportCardSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserReportsLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to their page. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Reports and Demo User'
        subtitle='About them or their comments, and ones they sent. Open and closed, the latest first; open ones are dealt with on the reports page.'
      />
      {/* Received and Sent. */}
      <Skeleton className='h-9 w-44 rounded-lg' />
      <div className='flex flex-col gap-4'>
        <ReportCardSkeleton />
        <ReportCardSkeleton />
      </div>
    </LoadingPage>
  );
}
