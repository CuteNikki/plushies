'use client';

import { formatAge } from '@/lib/birthday';

// Rendered on the client so the age stays correct without rebuilding the site.
export function PlushieAge({ birthday }: { birthday: string }) {
  return <span suppressHydrationWarning>{formatAge(birthday)}</span>;
}
