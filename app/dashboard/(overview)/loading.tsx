import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  SectionHeadingSkeleton,
  TextLinesSkeleton,
  TextSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

const tiles = ['Plushies', 'Photos', 'Likes', 'Comments', 'Changes in 7 days'];

// Admins see all four links, editors the first three. The texts are samples
// shaped like the real ones, so the cards wrap where the real ones do.
const links = [
  { title: 'Plushies', text: 'Browse and edit every plushie' },
  { title: 'New Plushie', text: 'Add a new soft friend' },
  { title: 'Activity', text: 'See and undo recent changes' },
  { title: 'Users', text: '1 account, 1 admin and 0 editors' },
];

export default function DashboardLoading() {
  return (
    <LoadingPage className='gap-8'>
      <HeadingSkeleton
        title='Good afternoon'
        subtitle='Everything for looking after the plushies.'
      />
      <div className='grid grid-cols-2 gap-4 lg:grid-cols-5'>
        {tiles.map((tile) => (
          <div
            key={tile}
            className='flex flex-col gap-1 rounded-xl p-4 ring-1 ring-foreground/10 last:col-span-2 lg:last:col-span-1'
          >
            <TextSkeleton className='text-sm'>{tile}</TextSkeleton>
            <TextSkeleton className='text-3xl font-semibold'>12</TextSkeleton>
          </div>
        ))}
      </div>
      <ul className='grid gap-4 sm:grid-cols-2'>
        {links.map((link) => (
          <li
            key={link.title}
            className='flex items-center gap-4 rounded-xl p-4 ring-1 ring-foreground/10'
          >
            <Skeleton className='size-10 shrink-0' />
            <div className='flex min-w-0 flex-1 flex-col'>
              <TextSkeleton className='font-heading font-semibold'>
                {link.title}
              </TextSkeleton>
              <TextSkeleton className='text-sm text-pretty'>
                {link.text}
              </TextSkeleton>
            </div>
            {/* Keeps the text as narrow as next to the real arrow. */}
            <div className='size-4 shrink-0' />
          </li>
        ))}
      </ul>
      <div className='grid gap-8 lg:grid-cols-2'>
        <div className='flex flex-col gap-4'>
          <SectionHeadingSkeleton
            title='Recently edited'
            description='Plushies that have been recently edited.'
          />
          <ListSkeleton
            rows={3}
            rowClassName='flex min-h-18 items-center gap-3 px-3 py-2'
          >
            <Skeleton className='size-10 shrink-0 rounded-lg' />
            <TextLinesSkeleton />
          </ListSkeleton>
        </div>
        <div className='flex flex-col gap-4'>
          <SectionHeadingSkeleton
            title='Needs attention'
            description='Plushies whose page is still missing something.'
          />
          <ListSkeleton
            rows={2}
            rowClassName='flex min-h-18 items-center gap-3 px-3 py-2'
          >
            <Skeleton className='size-10 shrink-0 rounded-lg' />
            <TextLinesSkeleton />
          </ListSkeleton>
        </div>
      </div>
    </LoadingPage>
  );
}
