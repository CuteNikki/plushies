import { cn } from '@/lib/utils';

import {
  HeadingSkeleton,
  ListSkeleton,
  LoadingPage,
  SectionHeadingSkeleton,
  TextSkeleton,
} from '@/components/skeletons';
import { StorageSkeleton } from '@/components/storage-usage';
import { Skeleton } from '@/components/ui/skeleton';

const tiles = ['Plushies', 'Photos', 'Likes', 'Comments', 'Changes in 7 days'];
const reportTiles = ['Open reports', 'Closed reports'];

// Admins see all five links, editors the first four. The texts are samples
// shaped like the real ones, so the cards wrap where the real ones do.
const links = [
  { title: 'Plushies', text: 'Browse and edit every plushie' },
  { title: 'New Plushie', text: 'Add a new soft friend' },
  { title: 'Activity', text: 'See and undo recent changes' },
  { title: 'Reports', text: 'Nothing reported right now' },
  { title: 'Users', text: '1 account, 1 admin and 0 editors' },
];

export default function DashboardLoading() {
  return (
    <LoadingPage className='gap-8'>
      <HeadingSkeleton
        title='Good afternoon'
        subtitle='Everything for looking after the plushies.'
      />
      <div className='flex flex-col gap-4'>
        <div className='grid grid-cols-2 gap-4 lg:grid-cols-5'>
          {tiles.map((tile) => (
            <TileSkeleton
              key={tile}
              label={tile}
              className='last:col-span-2 lg:last:col-span-1'
            />
          ))}
        </div>
        <div className='grid grid-cols-2 gap-4'>
          {reportTiles.map((tile) => (
            <TileSkeleton key={tile} label={tile} />
          ))}
        </div>
      </div>
      <ul className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
        {links.map((link) => (
          <li
            key={link.title}
            className='flex items-center gap-4 rounded-xl p-4 ring-1 ring-foreground/10 sm:odd:last:col-span-2'
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
      {/* Sections side by side share their header and list rows, as on
          the real page. Admins see all six; editors don't have New accounts. */}
      <div className='grid grid-cols-1 gap-8 lg:grid-cols-2'>
        <Section
          title='Recently edited'
          description='Plushies that have been recently edited.'
        >
          <Rows aside={<Skeleton className='h-6 w-14 shrink-0' />} />
        </Section>
        <Section
          title='Needs attention'
          description='3 plushies whose page is still missing something.'
        >
          <Rows
            aside={<Skeleton className='h-6 w-14 shrink-0' />}
            detail={
              <div className='flex gap-1'>
                <Skeleton className='h-6 w-24 rounded-full' />
                <Skeleton className='h-6 w-20 rounded-full' />
              </div>
            }
          />
        </Section>
        <Section
          title='Recent comments'
          description='12 comments in the last 7 days.'
        >
          <Rows aside={<Skeleton className='h-4 w-20 shrink-0' />} />
        </Section>
        <Section
          title='Upcoming birthdays'
          description='Whose birthday comes next.'
        >
          <Rows aside={<Skeleton className='h-4 w-16 shrink-0' />} />
        </Section>
        <Section
          title='New accounts'
          description='3 accounts in the last 7 days.'
        >
          <Rows
            photo={false}
            aside={<Skeleton className='h-6 w-14 rounded-full' />}
          />
        </Section>
        <Section title='Photo storage' description='Space used on UploadThing.'>
          <div className='self-start'>
            <StorageSkeleton />
          </div>
        </Section>
      </div>
    </LoadingPage>
  );
}

/** A dashboard section: heading, its "Show all" button, and a list. */
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className='row-span-2 grid grid-cols-1 grid-rows-subgrid gap-4'>
      <div className='flex items-end justify-between gap-2'>
        <SectionHeadingSkeleton title={title} description={description} />
        <Skeleton className='h-6 w-20 shrink-0' />
      </div>
      {children}
    </div>
  );
}

/**
 * Three rows as tall as the real ones: a photo, a name with a line under
 * it (or `detail`), and something on the right.
 */
function Rows({
  photo = true,
  detail,
  aside,
}: {
  photo?: boolean;
  detail?: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <ListSkeleton
      rows={3}
      rowClassName='flex min-h-18 items-center gap-3 px-3 py-2'
    >
      {photo && <Skeleton className='size-10 shrink-0 rounded-lg' />}
      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <Skeleton className='h-5 w-32 max-w-full' />
        {detail ?? <Skeleton className='h-4 w-48 max-w-full' />}
      </div>
      {aside}
    </ListSkeleton>
  );
}

function TileSkeleton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-xl p-3 ring-1 ring-foreground/10 xs:p-4',
        className
      )}
    >
      <TextSkeleton className='text-sm'>{label}</TextSkeleton>
      <TextSkeleton className='text-3xl font-semibold'>12</TextSkeleton>
    </div>
  );
}
