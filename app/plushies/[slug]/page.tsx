import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPlushie, getPlushies } from '@/lib/plushies';
import { site } from '@/lib/site';

import { PlushieAge } from '@/components/plushie-age';
import { EditPlushieButton } from '@/components/edit-plushie-button';
import {
  Reveal,
  RevealGroup,
  RevealItem,
  RevealQueue,
} from '@/components/motion';
import { PlushiePhotos } from '@/components/plushie-photos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export async function generateStaticParams() {
  const plushies = await getPlushies();
  return plushies.map((plushie) => ({ slug: plushie.slug }));
}

export async function generateMetadata(
  props: PageProps<'/plushies/[slug]'>
): Promise<Metadata> {
  const { slug } = await props.params;
  const plushie = await getPlushie(slug);
  if (!plushie) return {};

  // Link previews show the plushie's own photo. Without one, the site-wide
  // preview image is used. openGraph replaces the layout's, so the shared
  // fields are repeated here.
  const images = plushie.thumbnail
    ? [{ url: plushie.thumbnail.url, alt: `Photo of ${plushie.name}` }]
    : undefined;
  return {
    title: plushie.name,
    description: plushie.description,
    openGraph: {
      type: 'profile',
      siteName: site.name,
      title: `${plushie.name} · ${site.name}`,
      description: plushie.description,
      url: `/plushies/${plushie.slug}`,
      locale: 'en_US',
      images,
    },
    twitter: {
      card: plushie.thumbnail ? 'summary_large_image' : 'summary',
      title: `${plushie.name} · ${site.name}`,
      description: plushie.description,
      images,
    },
  };
}

export default async function PlushiePage(
  props: PageProps<'/plushies/[slug]'>
) {
  const { slug } = await props.params;
  const plushie = await getPlushie(slug);
  if (!plushie) notFound();

  const details: [string, React.ReactNode][] = [
    ['Species', plushie.species],
    ['Age', plushie.birthday && <PlushieAge birthday={plushie.birthday} />],
    ['Gender', plushie.gender],
    ['Pronouns', plushie.pronouns],
    ['Birthday', plushie.birthday && formatDate(plushie.birthday)],
    ['From', plushie.origin],
    ...plushie.facts.map(({ label, value }): [string, string] => [
      label,
      value,
    ]),
  ];

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex items-center justify-between gap-2'>
        <Button variant='ghost' size='sm' className='w-fit' asChild>
          <Link href='/'>
            <ArrowLeft />
            All plushies
          </Link>
        </Button>
        <EditPlushieButton id={plushie.id} />
      </Reveal>

      {/* Photos come in from the left and details from the right, each column
          as its own sequence so both play at the same time. */}
      <article className='grid gap-8 md:grid-cols-2'>
        <RevealQueue delay={0.1}>
          <PlushiePhotos plushie={plushie} />
        </RevealQueue>

        <RevealQueue delay={0.2}>
          <div className='flex flex-col gap-6'>
            <RevealGroup interval={0.12} className='flex flex-col gap-3'>
              <RevealItem direction='left'>
                <h1 className='font-heading text-4xl font-semibold tracking-tight sm:text-5xl'>
                  {plushie.name}
                </h1>
              </RevealItem>
              {plushie.traits.length > 0 && (
                <RevealItem direction='left' className='flex flex-wrap gap-1.5'>
                  {plushie.traits.map((trait) => (
                    <Badge key={trait} variant='secondary'>
                      {trait}
                    </Badge>
                  ))}
                </RevealItem>
              )}
              <RevealItem
                as='p'
                direction='left'
                className='mt-3 text-base leading-relaxed'
              >
                {plushie.description}
              </RevealItem>
            </RevealGroup>

            <RevealGroup
              as='dl'
              interval={0.08}
              className='grid grid-cols-2 gap-3'
            >
              {details
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <RevealItem
                    key={label}
                    direction='left'
                    className='rounded-xl bg-muted/60 px-4 py-3 ring-1 ring-foreground/5'
                  >
                    <dt className='text-xs text-muted-foreground'>{label}</dt>
                    <dd className='font-heading text-base font-medium'>
                      {value}
                    </dd>
                  </RevealItem>
                ))}
            </RevealGroup>
          </div>
        </RevealQueue>
      </article>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
