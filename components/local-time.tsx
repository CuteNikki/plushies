'use client';

import { formatDate, relative } from '@/lib/time';

/**
 * A time like '5 minutes ago', with the full date on hover. Formatted in the
 * browser, so it shows the viewer's own time zone.
 */
export function LocalTime({
  iso,
  className,
}: {
  iso: string;
  className?: string;
}) {
  return (
    <time
      dateTime={iso}
      title={formatDate(iso)}
      className={className}
      suppressHydrationWarning
    >
      {relative(iso)}
    </time>
  );
}
