import { HeartIcon } from 'lucide-react';
import Link from 'next/link';

const links = [
  { href: '/imprint', label: 'Imprint' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export function SiteFooter() {
  return (
    <footer className='border-t'>
      <div className='mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground xs:flex-row'>
        <p className='flex items-center gap-1.5'>
          Made with
          <HeartIcon className='size-3.5 fill-primary text-primary' />
          for soft friends
        </p>
        <nav className='flex gap-4'>
          {links.map(({ href, label }) => (
            <Link key={href} href={href} className='hover:text-primary'>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
