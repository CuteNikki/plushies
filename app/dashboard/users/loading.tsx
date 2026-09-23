import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  TextLinesSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <LoadingPage className='gap-6'>
      <HeadingSkeleton width='w-32' />
      <ListSkeleton rows={3}>
        <TextLinesSkeleton />
        <Skeleton className='hidden h-7 w-24 xs:block' />
        <Skeleton className='size-7' />
      </ListSkeleton>
    </LoadingPage>
  );
}
