import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Stands in for a list or section with nothing in it yet. The dashed border
 * sets it apart from cards with content; it centers itself in whatever
 * height it's given.
 */
export function EmptyState({
  icon: Icon,
  className,
  children,
}: {
  icon: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-foreground/20 p-6 text-center text-sm text-pretty text-muted-foreground',
        className
      )}
    >
      <span className='flex size-9 items-center justify-center rounded-full bg-muted text-primary/70'>
        <Icon className='size-4.5' aria-hidden />
      </span>
      <p>{children}</p>
    </div>
  );
}
