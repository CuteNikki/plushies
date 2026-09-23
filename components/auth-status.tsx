import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A card that reports how something went, like a sent email or a link that
 * didn't work: an icon in a soft circle, a title, text and actions.
 */
export function AuthStatus({
  icon: Icon,
  tone = 'primary',
  title,
  titleAs: Title = 'h2',
  children,
  actions,
}: {
  icon: LucideIcon;
  tone?: 'primary' | 'destructive';
  title: string;
  /** h1 when the card is all the page has, h2 when a heading sits above. */
  titleAs?: 'h1' | 'h2';
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className='flex flex-col items-center gap-4 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10'>
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-full',
          tone === 'primary'
            ? 'bg-primary/15 text-primary'
            : 'bg-destructive/15 text-destructive'
        )}
      >
        <Icon className='size-7' aria-hidden />
      </div>
      <div className='flex flex-col gap-1'>
        <Title className='font-heading text-xl font-semibold'>{title}</Title>
        <p className='text-sm text-balance text-muted-foreground'>{children}</p>
      </div>
      {actions && <div className='flex w-full flex-col gap-2'>{actions}</div>}
    </div>
  );
}
