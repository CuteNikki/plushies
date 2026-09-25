import Link from 'next/link';

import { cn } from '@/lib/utils';

/** For a row with a RowLink: tinted while the link is hovered. */
export const rowTint =
  'transition-colors has-[[data-row-link]:hover]:bg-muted/50';

/**
 * A row's name, linked, and stretched over its nearest `relative` parent so
 * all of that is clickable: e.g. the photo and details beside it. Other links
 * in there need `relative` too, to sit above it.
 */
export function RowLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-row-link
      className={cn(
        'block truncate font-heading font-semibold outline-none after:absolute after:inset-0 after:rounded-lg hover:underline focus-visible:after:ring-2 focus-visible:after:ring-ring',
        className
      )}
    >
      {children}
    </Link>
  );
}
