import { getPlushies } from '@/lib/plushies';

import { RevealGroup, RevealItem } from '@/components/motion';
import { PlushieGallery } from '@/components/plushie-gallery';

export default async function Page() {
  const plushies = await getPlushies();

  return (
    <div className='flex flex-col gap-8'>
      <RevealGroup as='section' className='flex flex-col gap-2'>
        <RevealItem>
          <h1 className='font-heading text-4xl font-semibold tracking-tight sm:text-5xl'>
            My{' '}
            <span className='bg-linear-to-r from-primary to-chart-5 bg-clip-text text-transparent'>
              plushies
            </span>
          </h1>
        </RevealItem>
        <RevealItem as='p' className='text-pretty text-muted-foreground'>
          {plushies.length} soft friends and counting. Click on one to learn
          more about them!
        </RevealItem>
      </RevealGroup>

      <PlushieGallery plushies={plushies} />
    </div>
  );
}
