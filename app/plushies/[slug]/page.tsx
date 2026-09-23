import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getPlushie, plushies } from '@/lib/plushies';

import { PlushieAge } from '@/components/plushie-age';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function generateStaticParams() {
  return plushies.map((plushie) => ({ slug: plushie.slug }));
}

export async function generateMetadata(
  props: PageProps<'/plushies/[slug]'>
): Promise<Metadata> {
  const { slug } = await props.params;
  const plushie = getPlushie(slug);
  if (!plushie) return {};
  return { title: plushie.name, description: plushie.description };
}

export default async function PlushiePage(
  props: PageProps<'/plushies/[slug]'>
) {
  const { slug } = await props.params;
  const plushie = getPlushie(slug);
  if (!plushie) notFound();

  const details: [string, React.ReactNode][] = [
    ['Species', plushie.species],
    ['Age', plushie.birthday && <PlushieAge birthday={plushie.birthday} />],
    ['Gender', plushie.gender],
    ['Pronouns', plushie.pronouns],
    ['Birthday', plushie.birthday && formatDate(plushie.birthday)],
    ['From', plushie.origin],
    ...Object.entries(plushie.facts ?? {}),
  ];

  return (
    <div className='flex flex-col gap-6'>
      <Button variant='ghost' size='sm' className='w-fit' asChild>
        <Link href='/'>
          <ArrowLeft />
          All plushies
        </Link>
      </Button>

      <article className='grid gap-8 md:grid-cols-2'>
        <PlushiePhoto
          plushie={plushie}
          sizes='(min-width: 768px) 50vw, 100vw'
          priority
          className='rounded-3xl ring-1 ring-foreground/10'
        />

        <div className='flex flex-col gap-6'>
          <div className='flex flex-col gap-3'>
            <h1 className='font-heading text-4xl font-semibold tracking-tight sm:text-5xl'>
              {plushie.name}
            </h1>
            {plushie.traits && plushie.traits.length > 0 && (
              <div className='flex flex-wrap gap-1.5'>
                {plushie.traits.map((trait) => (
                  <Badge
                    key={trait}
                    variant='secondary'
                    className='h-6 px-2.5 text-xs'
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <p className='text-base leading-relaxed'>{plushie.description}</p>

          <dl className='grid grid-cols-2 gap-3'>
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div
                  key={label}
                  className='rounded-xl bg-muted/60 px-4 py-3 ring-1 ring-foreground/5'
                >
                  <dt className='text-xs text-muted-foreground'>{label}</dt>
                  <dd className='font-heading text-base font-medium'>
                    {value}
                  </dd>
                </div>
              ))}
          </dl>
        </div>
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
