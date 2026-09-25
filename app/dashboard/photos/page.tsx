import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { ImageIcon, PencilIcon, SearchIcon, StarIcon } from 'lucide-react';

import { getPlushies } from '@/data/plushies';
import { oneOf, plainQuery, searchQuery } from '@/lib/list-params';
import { requireEditor } from '@/lib/session';
import { count } from '@/lib/utils';

import { BackButton } from '@/components/back-button';
import { EmptyState } from '@/components/empty-state';
import { ListControls } from '@/components/list-controls';
import { Reveal } from '@/components/motion';
import { StorageUsage } from '@/components/storage-usage';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Photos' };

const sorts = ['most', 'fewest', 'name'] as const;

export default async function PhotosPage(
  props: PageProps<'/dashboard/photos'>
) {
  await requireEditor();
  const searchParams = await props.searchParams;
  const query = plainQuery(searchParams);
  const q = searchQuery(searchParams.q)?.toLowerCase();
  const sort = oneOf(searchParams.sort, sorts);
  // Each plushie's photos as its page shows them: the thumbnail, then the
  // gallery in order. Plushies without any are under Needs attention.
  const plushies = (await getPlushies())
    .map((plushie) => ({
      ...plushie,
      photos: [
        ...(plushie.thumbnail ? [{ ...plushie.thumbnail, main: true }] : []),
        ...plushie.gallery.map((photo) => ({ ...photo, main: false })),
      ],
    }))
    .filter(
      (plushie) =>
        plushie.photos.length > 0 &&
        (!q || plushie.name.toLowerCase().includes(q))
    )
    // Most photos first by default: the wide cards take each row first and
    // the small ones fill in after, so the gaps end up at the end.
    .sort(
      (a, b) =>
        (sort === 'most'
          ? b.photos.length - a.photos.length
          : sort === 'fewest'
            ? a.photos.length - b.photos.length
            : 0) || a.name.localeCompare(b.name)
    );
  const total = plushies.reduce((sum, p) => sum + p.photos.length, 0);

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex'>
        <BackButton href='/dashboard'>Dashboard</BackButton>
      </Reveal>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Photos
        </h1>
        <p className='text-pretty text-muted-foreground'>
          {count(total, 'photo')} on {count(plushies.length, 'plushie')}.
        </p>
      </Reveal>

      <Reveal>
        <StorageUsage />
      </Reveal>

      <Reveal>
        <ListControls
          query={query}
          search={{ label: 'Search photos', placeholder: 'Search plushies' }}
          selects={[
            {
              param: 'sort',
              label: 'Order',
              options: [
                { value: 'most', label: 'Most photos' },
                { value: 'fewest', label: 'Fewest photos' },
                { value: 'name', label: 'Name A–Z' },
              ],
            },
          ]}
        />
      </Reveal>

      {plushies.length === 0 && (
        <Reveal>
          <EmptyState icon={q ? SearchIcon : ImageIcon}>
            {q ? 'No plushies match.' : 'No photos yet.'}
          </EmptyState>
        </Reveal>
      )}

      {/* Each plushie's photos as a card only as wide as they are, so
          plushies with a photo or two sit side by side. */}
      <div className='flex flex-wrap gap-4'>
        {plushies.map((plushie) => (
          <Reveal
            as='section'
            key={plushie.id}
            className='flex max-w-full flex-col gap-2 rounded-xl p-3 ring-1 ring-foreground/10'
          >
            <div className='flex items-start gap-2'>
              <div className='min-w-0 flex-1'>
                <h2 className='truncate'>
                  <Link
                    href={`/plushies/${plushie.slug}`}
                    className='font-heading text-lg font-semibold hover:underline'
                  >
                    {plushie.name}
                  </Link>
                </h2>
                <p className='text-sm text-muted-foreground'>
                  {count(plushie.photos.length, 'photo')}
                </p>
              </div>
              <Button variant='outline' size='icon-sm' asChild>
                <Link
                  href={`/dashboard/plushies/${plushie.id}`}
                  aria-label={`Edit ${plushie.name}`}
                  title='Edit'
                >
                  <PencilIcon />
                </Link>
              </Button>
            </div>
            <ul className='flex flex-wrap gap-2'>
              {plushie.photos.map((photo, index) => (
                <li
                  key={photo.key}
                  className='relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-36'
                >
                  {/* The full-size photo, for a closer look. */}
                  <a
                    href={photo.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='block size-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
                  >
                    <Image
                      src={photo.url}
                      alt={`Photo ${index + 1} of ${plushie.name}`}
                      fill
                      sizes='(min-width: 640px) 144px, 96px'
                      className='object-cover'
                    />
                  </a>
                  {/* Filled, like the star that picks it on the edit page. */}
                  {photo.main && (
                    <span
                      title='Thumbnail'
                      className='absolute top-1.5 left-1.5 flex size-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow'
                    >
                      <StarIcon className='size-3.5 fill-current' aria-hidden />
                      <span className='sr-only'>Thumbnail</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
