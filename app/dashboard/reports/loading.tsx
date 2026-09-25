import {
  HeadingSkeleton,
  LoadingPage,
  ReportCardSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function ReportsLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Reports'
        subtitle='Comments and accounts people reported. 3 reports in 24 hours hide a comment until it’s kept or deleted.'
      />
      {/* All, Comments and Users, then Open and Closed. */}
      <div className='flex flex-wrap gap-2'>
        <Skeleton className='h-9 w-60 rounded-lg' />
        <Skeleton className='h-9 w-36 rounded-lg' />
      </div>
      <div className='flex flex-col gap-4'>
        <ReportCardSkeleton />
        <ReportCardSkeleton />
      </div>
    </LoadingPage>
  );
}
