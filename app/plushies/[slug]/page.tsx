import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPlushie, getPlushies } from '@/data/plushies';
import { formatBirthday } from '@/lib/birthday';
import { site } from '@/lib/site';

import { BackButton } from '@/components/back-button';
import { EditPlushieButton } from '@/components/edit-plushie-button';
import {
  Reveal,
  RevealGroup,
  RevealItem,
  RevealQueue,
} from '@/components/motion';
import { PlushieAge } from '@/components/plushie-age';
import { PlushiePhotos } from '@/components/plushie-photos';
import { Badge } from '@/components/ui/badge';

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

  // The preview image comes from opengraph-image.tsx next to this page.
  // openGraph replaces the layout's, so the shared fields are repeated here.
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
    },
    twitter: {
      card: 'summary_large_image',
      title: `${plushie.name} · ${site.name}`,
      description: plushie.description,
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
    ['Birthday', plushie.birthday && formatBirthday(plushie.birthday)],
    ['From', plushie.origin],
    ...plushie.facts.map(({ label, value }): [string, string] => [
      label,
      value,
    ]),
  ];

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex items-center justify-between gap-2'>
        <BackButton href='/'>All plushies</BackButton>
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
