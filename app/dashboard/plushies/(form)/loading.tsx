import { cn } from '@/lib/utils';

import {
  LoadingPage,
  SectionHeadingSkeleton,
  TextSkeleton,
} from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

/** In the form's order, with the hints some of them have. */
const fields = [
  { label: 'Name' },
  { label: 'URL name', hint: 'Used in the link, e.g. /plushies/mochi' },
  { label: 'Species' },
  { label: 'From' },
  { label: 'Birthday', hint: 'Just the year, or year and month, is fine too.' },
  { label: 'Traits', hint: 'Separate with commas' },
  { label: 'Gender' },
  { label: 'Pronouns' },
  {
    label: 'Group',
    hint: 'Plushies in a group stay together. Pick one or type a new name.',
  },
];

/** Shared by the new and edit plushie pages. */
export default function PlushieFormLoading() {
  return (
    <LoadingPage className='mx-auto w-full max-w-3xl gap-8'>
      <div className='flex flex-col gap-6'>
        {/* Back to the plushies. */}
        <Skeleton className='h-6 w-24' />
        <TextSkeleton
          as='div'
          className='font-heading text-4xl font-semibold tracking-tight'
        >
          New Plushie
        </TextSkeleton>
      </div>
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
      <div className='flex flex-col gap-4'>
        <SectionHeadingSkeleton title='About' />
        <div className='grid gap-4 sm:grid-cols-2'>
          {fields.map(({ label, hint }) => (
            <FieldSkeleton
              key={label}
              label={label}
              hint={hint}
              // The birthday's label is a legend, with more room under it.
              labelClassName={label === 'Birthday' ? 'mb-2' : undefined}
            />
          ))}
        </div>
        <FieldSkeleton
          label='Description'
          hint='Type @ to mention another plushie and link to them.'
          inputClassName='h-16'
        />
      </div>
      <div className='flex flex-col gap-4'>
        <SectionHeadingSkeleton
          title='Facts'
          description='Anything else, e.g. Favorite food.'
        />
        {/* Add Fact. */}
        <Skeleton className='h-6 w-20' />
      </div>
      {/* Create and Cancel. */}
      <div className='flex gap-2 border-t pt-6'>
        <Skeleton className='h-7 w-16' />
        <Skeleton className='h-7 w-16' />
      </div>
    </LoadingPage>
  );
}

function FieldSkeleton({
  label,
  hint,
  labelClassName,
  inputClassName,
}: {
  label: string;
  hint?: string;
  labelClassName?: string;
  inputClassName?: string;
}) {
  return (
    <div className='flex flex-col gap-2'>
      <TextSkeleton
        as='div'
        className={cn(
          'text-xs/relaxed leading-none font-medium',
          labelClassName
        )}
      >
        {label}
      </TextSkeleton>
      <Skeleton className={inputClassName ?? 'h-7'} />
      {hint && <TextSkeleton className='text-xs'>{hint}</TextSkeleton>}
    </div>
  );
}
