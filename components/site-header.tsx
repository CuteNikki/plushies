import Link from 'next/link';

import { HeartIcon } from 'lucide-react';

import { ThemeButton } from '@/components/theme-button';
import { UserMenu } from '@/components/user-menu';

export function SiteHeader() {
  return (
    <header className='sticky top-0 z-10 border-b bg-background/80 backdrop-blur'>
      <div className='mx-auto flex h-14 max-w-6xl items-center justify-between px-4'>
        <Link
          href='/'
          className='flex items-center gap-2 font-heading text-lg font-semibold'
        >
          <HeartIcon className='size-5 fill-primary text-primary' />
          Plushies
        </Link>
        <div className='flex items-center gap-2'>
          <UserMenu />
          <ThemeButton />
        </div>
      </div>
    </header>
  );
}
