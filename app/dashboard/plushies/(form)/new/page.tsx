import type { Metadata } from 'next';

import { getMentionOptions, getPlushieById } from '@/data/plushies';
import { requireEditor } from '@/lib/session';

import { BackButton } from '@/components/back-button';
import { Reveal } from '@/components/motion';
import { PlushieForm } from '@/components/plushie-form';

export const metadata: Metadata = { title: 'New Plushie' };

export default async function NewPlushiePage(
  props: PageProps<'/dashboard/plushies/new'>
) {
  await requireEditor();
  // Duplicating starts from another plushie's details.
  const { from } = await props.searchParams;
  const [source, plushies] = await Promise.all([
    typeof from === 'string' ? getPlushieById(from) : null,
    getMentionOptions(),
  ]);

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-8'>
      <div className='flex flex-col gap-6'>
        <Reveal className='flex'>
          <BackButton href='/dashboard/plushies'>Plushies</BackButton>
        </Reveal>
        <Reveal className='flex flex-col gap-1'>
          <h1 className='font-heading text-4xl font-semibold tracking-tight'>
            New Plushie
          </h1>
          {source && (
            <p className='text-sm text-pretty text-muted-foreground'>
              Starting from {source.name}. Their name and photos aren’t copied.
            </p>
          )}
        </Reveal>
      </div>
      <PlushieForm
        key={source?.id}
        source={source ?? undefined}
        plushies={plushies}
      />
    </div>
  );
}
