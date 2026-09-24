import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getPlushieById } from '@/data/plushies';
import { requireEditor } from '@/lib/session';

import { Reveal } from '@/components/motion';
import { PlushieForm } from '@/components/plushie-form';

export const metadata: Metadata = { title: 'Edit Plushie' };

export default async function EditPlushiePage(
  props: PageProps<'/dashboard/plushies/[id]'>
) {
  await requireEditor();
  const { id } = await props.params;
  const plushie = await getPlushieById(id);
  if (!plushie) notFound();

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-8'>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Edit {plushie.name}
        </h1>
      </Reveal>
      {/* Reset the form's state when switching between plushies. */}
      <PlushieForm key={plushie.id} plushie={plushie} />
    </div>
  );
}
