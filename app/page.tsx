import { plushies } from '@/lib/plushies';

import { PlushieGallery } from '@/components/plushie-gallery';

export default function Page() {
  return (
    <div className='flex flex-col gap-8'>
      <section className='flex flex-col gap-2'>
        <h1 className='font-heading text-4xl font-semibold tracking-tight sm:text-5xl'>
          My{' '}
          <span className='bg-linear-to-r from-primary to-chart-5 bg-clip-text text-transparent'>
            plushies
          </span>
        </h1>
        <p className='text-muted-foreground'>
          {plushies.length} soft friends and counting. Click on one to learn
          more about them!
        </p>
      </section>

      <PlushieGallery plushies={plushies} />
    </div>
  );
}
