import Link from 'next/link';

import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';

export default function NoAccessPage() {
  return (
    <Reveal className='flex flex-col items-center gap-4 py-24 text-center'>
      <h1 className='font-heading text-4xl font-semibold'>Not quite yet</h1>
      <p className='max-w-md text-muted-foreground'>
        You&rsquo;re signed in, but your account can&rsquo;t edit plushies. Ask
        an admin to make you an editor.
      </p>
      <Button asChild>
        <Link href='/'>Back to all plushies</Link>
      </Button>
    </Reveal>
  );
}
