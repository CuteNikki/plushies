import Link from 'next/link';

import { HomeIcon } from 'lucide-react';

import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

export default function NoAccessPage() {
  return (
    <Reveal
      data-fill
      className='flex flex-1 flex-col items-center justify-center gap-4 py-12 text-center'
    >
      <h1 className='font-heading text-4xl font-semibold'>Not quite yet</h1>
      <p className='max-w-md text-pretty text-muted-foreground'>
        You&rsquo;re signed in, but your account can&rsquo;t edit plushies.
        <br />
        Ask an admin to make you an editor.
      </p>
      <Button asChild>
        <Link href='/'>
          <HomeIcon />
          Back Home
        </Link>
      </Button>
    </Reveal>
  );
}
