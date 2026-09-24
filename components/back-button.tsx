import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';

/** A small link back to the page above, shown at the top of a page. */
export function BackButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Button variant='ghost' size='sm' className='w-fit' asChild>
      <Link href={href}>
        <ArrowLeftIcon />
        {children}
      </Link>
    </Button>
  );
}
