import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersLoading() {
  return (
    <LoadingPage className='gap-6'>
      {/* Back to the dashboard. */}
      <Skeleton className='h-6 w-24' />
      <HeadingSkeleton
        title='Users'
        subtitle='Editors can add and change plushies. Admins can also manage users.'
      />
      <ListSkeleton
        rows={1}
        rowClassName='grid grid-cols-[1fr_auto] items-center gap-3 p-4 xs:grid-cols-[1fr_auto_auto]'
      >
        {/* Name, email, then badges and the join date. */}
        <div className='flex min-w-0 flex-col gap-1.5'>
          <Skeleton className='my-0.5 h-5 w-32 max-w-full' />
          <Skeleton className='my-0.5 h-4 w-52 max-w-full' />
          <div className='flex flex-wrap items-center gap-1.5'>
            {/* Verified, Email and Discord, then the join date. */}
            <Skeleton className='h-6 w-20 rounded-full' />
            <Skeleton className='h-6 w-14 rounded-full' />
            <Skeleton className='h-6 w-16 rounded-full' />
            <Skeleton className='my-0.5 h-3 w-28' />
          </div>
        </div>
        <Skeleton className='size-7 self-start xs:order-last xs:self-center' />
        <Skeleton className='col-span-2 h-7 w-full xs:col-span-1 xs:w-24' />
      </ListSkeleton>
    </LoadingPage>
  );
}
