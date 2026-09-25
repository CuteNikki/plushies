import {
  CommentRowsSkeleton,
  ListSkeleton,
  LoadingPage,
  SectionHeadingSkeleton,
  TextLinesSkeleton,
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
      <div className='flex flex-col gap-4'>
        <SectionHead title='Likes' description='7 plushies liked.' showAll />
        {/* A row of six, each with its name under it. */}
        <div className='grid grid-cols-3 gap-3 sm:grid-cols-6'>
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className='flex flex-col gap-1.5'>
              <Skeleton className='aspect-square rounded-xl' />
              <Skeleton className='my-0.5 h-4 w-16 max-w-full' />
            </div>
          ))}
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        <SectionHead
          title='Reports'
          description='0 reports about them or their comments, 0 sent by them.'
        />
        {/* Received and Sent, then usually no reports: an empty box. */}
        <Skeleton className='h-9 w-44 rounded-lg' />
        <div className='flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/20'>
          <Skeleton className='size-9 rounded-full' />
          <Skeleton className='h-4 w-64 max-w-full' />
        </div>
      </div>
      <div className='flex flex-col gap-4'>
        <SectionHead
          title='Comments'
          description='22 comments, the latest 5 shown.'
          showAll
        />
        <CommentRowsSkeleton rows={3} />
      </div>
      <div className='flex flex-col gap-4'>
        <SectionHead
          title='Activity'
          description='Changes to this account and changes they made, from the last 90 days.'
          showAll
        />
        <ListSkeleton rows={3} rowClassName='flex items-start gap-3 p-4'>
          <Skeleton className='size-8 shrink-0' />
          <TextLinesSkeleton />
        </ListSkeleton>
      </div>
      {/* Ban is last on the page, and not there on your own: left out. */}
    </LoadingPage>
  );
}

/** A section's heading, with its Show all link when there's usually more. */
function SectionHead({
  title,
  description,
  showAll,
}: {
  title: string;
  description: string;
  showAll?: boolean;
}) {
  return (
    <div className='flex items-end justify-between gap-2'>
      <SectionHeadingSkeleton title={title} description={description} />
      {showAll && <Skeleton className='h-6 w-20 shrink-0' />}
    </div>
  );
}
