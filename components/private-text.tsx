'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

/**
 * Blurred until hovered, or tapped/clicked to toggle on devices without
 * hover, e.g. for emails on screen shares.
 */
export function PrivateText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type='button'
      onClick={() => setRevealed((value) => !value)}
      aria-pressed={revealed}
      title={revealed ? 'Click to hide' : 'Click to show'}
      className={cn(
        'cursor-pointer rounded-sm text-left break-all transition-[filter] duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring',
        revealed ? 'blur-none' : 'blur-[5px] select-none hover:blur-none',
        className
      )}
    >
      {children}
    </button>
  );
}
