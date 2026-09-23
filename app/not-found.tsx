import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className='flex flex-col items-center gap-4 py-24 text-center'>
      <h1 className='font-heading text-4xl font-semibold'>Hmm, nobody here</h1>
      <p className='text-muted-foreground'>
        This plushie must be hiding under the blankets.
      </p>
      <Button asChild>
        <Link href='/'>Back to all plushies</Link>
      </Button>
    </div>
  );
}
