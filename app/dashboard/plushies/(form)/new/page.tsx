import type { Metadata } from 'next';

import {
  getGroupNames,
  getMentionOptions,
  getPlushieById,
} from '@/data/plushies';
import { requireEditor } from '@/lib/session';

import { BackButton } from '@/components/back-button';
import { Reveal } from '@/components/motion';
import { PlushieForm } from '@/components/plushie-form';
import { StartFromSelect } from '@/components/start-from-select';
import { Label } from '@/components/ui/label';

export const metadata: Metadata = { title: 'New Plushie' };

export default async function NewPlushiePage(
  props: PageProps<'/dashboard/plushies/new'>
) {
  await requireEditor();
  // Duplicating starts from another plushie's details.
  const { from } = await props.searchParams;
  const [source, plushies, groups] = await Promise.all([
    typeof from === 'string' ? getPlushieById(from) : null,
    getMentionOptions(),
    getGroupNames(),
  ]);

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-8'>
      <div className='flex flex-col gap-6'>
        <Reveal className='flex'>
          <BackButton href='/dashboard/plushies'>Plushies</BackButton>
        </Reveal>
        <Reveal>
          <h1 className='font-heading text-4xl font-semibold tracking-tight'>
            New Plushie
          </h1>
        </Reveal>
        {plushies.length > 0 && (
          <Reveal className='flex flex-col gap-2 rounded-xl bg-muted/60 p-4 ring-1 ring-foreground/5'>
            <Label htmlFor='start-from'>Start from</Label>
            <StartFromSelect plushies={plushies} value={source?.id} />
            <p className='text-xs text-pretty text-muted-foreground'>
              {source
                ? `Filled in from ${source.name}, except their name and photos.`
                : 'Copies another plushie’s details, e.g. for one of the same species or group.'}
            </p>
          </Reveal>
        )}
      </div>
      <PlushieForm
        key={source?.id}
        source={source ?? undefined}
        plushies={plushies}
        groups={groups}
      />
    </div>
  );
}
