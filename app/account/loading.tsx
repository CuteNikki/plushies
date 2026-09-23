import {
  HeadingSkeleton,
  LoadingPage,
  SectionSkeleton,
} from '@/components/skeletons';

export default function AccountLoading() {
  return (
    <LoadingPage className='mx-auto w-full max-w-2xl gap-6'>
      <HeadingSkeleton />
      <SectionSkeleton height='h-16' />
      <SectionSkeleton height='h-36' />
      <SectionSkeleton height='h-44' />
      <SectionSkeleton height='h-28' />
    </LoadingPage>
  );
}
