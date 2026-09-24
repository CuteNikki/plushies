import { HeartIcon } from 'lucide-react';
import Image from 'next/image';

import { getPlushies } from '@/data/plushies';
import { cn } from '@/lib/utils';

import { Reveal, RevealQueue } from '@/components/motion';

/**
 * Slight tilts and offsets for the stacked photos, back to front, with a
 * centered arrangement for each number of photos.
 */
const stacks = [
  [],
  ['left-20 top-6 -rotate-6'],
  ['left-8 top-8 -rotate-6', 'left-32 top-2 rotate-5'],
  [
    'left-0 top-6 -rotate-8',
    'left-20 top-0 rotate-6',
    'left-40 top-10 -rotate-3',
  ],
];

/**
 * Layout for the sign-in and email pages: the form column, centered between
 * header and footer, with a brand panel beside it on wide screens.
 */
export async function AuthShell({ children }: { children: React.ReactNode }) {
  const photos = (await getPlushies())
    .filter((plushie) => plushie.thumbnail)
    .toReversed()
    .slice(0, stacks.length - 1);
  const stack = stacks[photos.length];

  return (
    <div
      data-fill
      className='grid w-full flex-1 content-center items-center gap-16 py-8 lg:grid-cols-2'
    >
      {/* Its own sequence, so it animates alongside the form. */}
      <RevealQueue>
        <Reveal
          direction='right'
          className='hidden flex-col gap-10 justify-self-center lg:flex'
          aria-hidden
        >
          <div className='relative h-72 w-96'>
            {photos.length > 0 ? (
              photos.map((plushie, index) => (
                <div
                  key={plushie.slug}
                  className={cn(
                    'absolute size-56 overflow-hidden rounded-2xl bg-card p-2 shadow-xl ring-1 shadow-black/20 ring-foreground/10',
                    stack[index]
                  )}
                >
                  <div className='relative size-full overflow-hidden rounded-xl'>
                    <Image
                      src={plushie.thumbnail!.url}
                      alt=''
                      fill
                      sizes='224px'
                      className='object-cover'
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className='absolute inset-0 m-auto flex size-56 items-center justify-center rounded-3xl bg-card ring-1 ring-foreground/10'>
                <HeartIcon className='size-28 fill-primary text-primary' />
              </div>
            )}
          </div>
          <div className='flex flex-col gap-2'>
            <p className='bg-linear-to-r from-primary to-chart-5 bg-clip-text font-heading text-5xl font-semibold text-transparent'>
              Plushies
            </p>
            <p className='font-heading text-2xl font-medium'>
              Meet my soft friends
            </p>
            <p className='max-w-sm text-muted-foreground'>
              Names, birthdays, favorite things and photos, all in one cozy
              place.
            </p>
          </div>
        </Reveal>
      </RevealQueue>

      <div className='mx-auto flex w-full max-w-sm flex-col gap-6'>
        {children}
      </div>
    </div>
  );
}
