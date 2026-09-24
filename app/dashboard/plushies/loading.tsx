import {
  LoadingPage,
  SectionHeadingSkeleton,
  SectionSkeleton,
  TextSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/** Shared by the new and edit plushie pages. */
export default function PlushieFormLoading() {
  return (
    <LoadingPage className='mx-auto w-full max-w-3xl gap-8'>
      <TextSkeleton
        as='div'
        className='font-heading text-4xl font-semibold tracking-tight'
      >
        New Plushie
      </TextSkeleton>
      <div className='flex flex-col gap-4'>
        <SectionHeadingSkeleton
          title='Thumbnail'
          description='The main photo, shown on the home page and first on their page.'
        />
        <Skeleton className='size-48 rounded-xl' />
      </div>
      <div className='flex flex-col gap-4'>
        <SectionHeadingSkeleton
          title='Gallery'
          description='More photos, shown on their page. Use the arrows to reorder.'
        />
        <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className='aspect-square rounded-xl' />
          ))}
        </div>
      </div>
      <SectionSkeleton title='About' height='h-64' />
    </LoadingPage>
  );
}
