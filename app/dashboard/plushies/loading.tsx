import { LoadingPage, SectionSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/** Shared by the new and edit plushie pages. */
export default function PlushieFormLoading() {
  return (
    <LoadingPage className='mx-auto w-full max-w-3xl gap-8'>
      <Skeleton className='h-10 w-56' />
      <div className='flex flex-col gap-4'>
        <Skeleton className='h-7 w-32' />
        <Skeleton className='size-48 rounded-xl' />
      </div>
      <div className='flex flex-col gap-4'>
        <Skeleton className='h-7 w-28' />
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className='aspect-square rounded-xl' />
          ))}
        </div>
      </div>
      <SectionSkeleton height='h-64' />
    </LoadingPage>
  );
}
