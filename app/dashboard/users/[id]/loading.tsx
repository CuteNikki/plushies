import {
  CommentRowsSkeleton,
  LoadingPage,
  SectionHeadingSkeleton,
  SectionSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UserLoading() {
  return (
    <LoadingPage className='gap-8'>
      <div className='flex flex-col gap-6'>
        {/* Back to the users. */}
        <Skeleton className='h-6 w-24' />
        <div className='flex flex-wrap items-start justify-between gap-4'>
          {/* Name, email, then badges and the join date. */}
          <div className='flex flex-col gap-1.5'>
            <Skeleton className='my-1 h-8 w-48 max-w-full' />
            <Skeleton className='my-0.5 h-5 w-56 max-w-full' />
            <div className='flex flex-wrap items-center gap-1.5'>
              <Skeleton className='h-6 w-20 rounded-full' />
              <Skeleton className='h-6 w-14 rounded-full' />
              <Skeleton className='my-0.5 h-3 w-28' />
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Skeleton className='h-7 w-32' />
            <Skeleton className='size-7' />
          </div>
        </div>
      </div>
      <SectionSkeleton title='Ban' height='h-40' />
      <div className='flex flex-col gap-4'>
        <SectionHeadingSkeleton title='Likes' description='3 plushies liked.' />
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8'>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className='aspect-square rounded-xl' />
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        <SectionHeadingSkeleton title='Comments' description='3 comments.' />
        <CommentRowsSkeleton rows={2} />
      </div>
      <SectionSkeleton title='Activity' height='h-48' />
    </LoadingPage>
  );
}
