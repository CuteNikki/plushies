import {
  HeadingSkeleton,
  LoadingPage,
  TextSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

// Admins see all three links, editors the first two. The texts are samples
// shaped like the real ones, so the cards wrap where the real ones do.
const links = [
  { title: 'Plushies', text: '3 plushies with 7 photos' },
  { title: 'New Plushie', text: 'Add a new soft friend' },
  { title: 'Users', text: '1 account, 1 admin and 0 editors' },
];

export default function DashboardLoading() {
  return (
    <LoadingPage className='gap-6'>
      <HeadingSkeleton
        title='Dashboard'
        subtitle='Everything for looking after the plushies.'
      />
      <ul className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
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
    </LoadingPage>
  );
}
