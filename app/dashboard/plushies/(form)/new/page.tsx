import type { Metadata } from 'next';

import { requireEditor } from '@/lib/session';

import { BackButton } from '@/components/back-button';
import { Reveal } from '@/components/motion';
import { PlushieForm } from '@/components/plushie-form';

export const metadata: Metadata = { title: 'New Plushie' };

export default async function NewPlushiePage() {
  await requireEditor();

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
      </div>
      <PlushieForm />
    </div>
  );
}
