import { HeadingSkeleton, LoadingPage } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function ArrangePlushiesLoading() {
  return (
    <LoadingPage className='mx-auto w-full max-w-2xl gap-6'>
      {/* Back to the plushies. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Arrange Plushies'
        subtitle='The order on the home page. Drag by the handle or use the arrows; changes save right away. Plushies in a group stay together, and you choose a plushie’s group in their form.'
      />
      <div className='flex flex-col gap-3'>
        {/* Where "Saving…" shows. */}
        <div className='h-5' />
        <div className='flex flex-col gap-2'>
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className='h-14 rounded-xl' />
          ))}
        </div>
      </div>
    </LoadingPage>
  );
}
