import Link from 'next/link';

import { HeartCrackIcon, HouseIcon } from 'lucide-react';

import { getPlushies } from '@/data/plushies';

import { Reveal } from '@/components/motion';
import { PlushieCard } from '@/components/plushie-card';
import { Button } from '@/components/ui/button';

/**
 * Shared layout for the not-found pages: the message, then a few plushies
 * to visit instead, so the page isn't a dead end.
 */
export async function NotFoundMessage({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  const newest = (await getPlushies()).toReversed().slice(0, 4);

  return (
    <div
      data-fill
      className='flex flex-1 flex-col items-center justify-center gap-6 py-12'
    >
      <Reveal className='flex flex-col items-center gap-2 text-center'>
        <div className='relative'>
          <HeartCrackIcon
            className='size-24 fill-primary/15 text-primary/70'
            aria-hidden
          />
          <span className='absolute -right-6 -bottom-1 rounded-full bg-muted px-2 py-0.5 font-heading text-sm font-semibold text-muted-foreground ring-1 ring-foreground/10'>
            404
          </span>
        </div>
        <div className='flex max-w-md flex-col gap-2'>
          <h1 className='font-heading text-4xl font-semibold tracking-tight'>
            {title}
          </h1>
          <p className='text-balance text-muted-foreground'>{text}</p>
        </div>
        <Button asChild>
          <Link href='/'>
            <HouseIcon className='shrink-0' />
            Go Home
          </Link>
        </Button>
      </Reveal>

      {newest.length > 0 && (
        <section className='flex w-full flex-col gap-2'>
          <Reveal as='header' className='text-center'>
            <h2 className='font-heading text-xl font-semibold'>
              Wanna see some of my plushies instead?
            </h2>
          </Reveal>
          {/* Centered, so fewer than four plushies still sit in the middle. */}
          <ul className='flex flex-wrap justify-center gap-4'>
            {newest.map((plushie) => (
              <Reveal
                as='li'
                key={plushie.slug}
                className='w-[calc(50%-0.5rem)] sm:w-[calc(25%-0.75rem)]'
              >
                <PlushieCard
                  plushie={plushie}
                  sizes='(min-width: 640px) 25vw, 50vw'
                />
              </Reveal>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
