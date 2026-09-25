import {
  HeadingSkeleton,
  ListControlsSkeleton,
  LoadingPage,
} from '@/components/skeletons';
import { StorageSkeleton } from '@/components/storage-usage';
import { Skeleton } from '@/components/ui/skeleton';

export default function PhotosLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton title='Photos' subtitle='12 photos on 4 plushies.' />
      <StorageSkeleton />
      {/* Search, and the order. */}
      <ListControlsSkeleton selects={1} />
      <div className='flex flex-wrap gap-4'>
        {[5, 1, 1, 1].map((photos, index) => (
          <div
            key={index}
            className='flex flex-col gap-2 rounded-xl p-3 ring-1 ring-foreground/10'
          >
            <div className='flex items-start gap-2'>
              <div className='flex flex-1 flex-col gap-1'>
                <Skeleton className='h-6 w-24' />
                <Skeleton className='h-5 w-14' />
              </div>
              {/* Edit, and ⋯ for the rest. */}
              <Skeleton className='size-6' />
              <Skeleton className='size-6' />
            </div>
            <div className='flex flex-wrap gap-2'>
              {Array.from({ length: photos }, (_, photo) => (
                <Skeleton
                  key={photo}
                  className='size-24 rounded-lg sm:size-36'
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </LoadingPage>
  );
}
