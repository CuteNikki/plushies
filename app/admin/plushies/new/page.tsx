import type { Metadata } from 'next';

import { requireEditor } from '@/lib/session';

import { PlushieForm } from '@/components/plushie-form';

export const metadata: Metadata = { title: 'New plushie' };

export default async function NewPlushiePage() {
  await requireEditor();

  return (
    <div className='mx-auto flex max-w-3xl flex-col gap-8'>
      <h1 className='font-heading text-4xl font-semibold tracking-tight'>
        New plushie
      </h1>
      <PlushieForm />
    </div>
  );
}
