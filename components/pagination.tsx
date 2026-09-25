'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  MoreHorizontalIcon,
} from 'lucide-react';

import {
  PAGE_SIZES,
  pageItems,
  withQuery,
  type PageSizes,
} from '@/lib/list-params';

import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/**
 * Under a list that's shown a page at a time: which ones these are, Previous
 * and Next with the page numbers between, and how many to show on a page.
 * The page is ?page= and the size ?per=, so links keep them; the rest of the
 * query, like a search, stays as it is. Nothing when it all fits on the
 * smallest page.
 */
export function Pagination({
  query,
  page,
  total,
  sizes = PAGE_SIZES,
}: {
  /** The page's current query, from its searchParams. */
  query: Record<string, string>;
  /** The page shown, counted from 1. */
  page: number;
  /** How many there are across every page. */
  total: number;
  sizes?: PageSizes;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const size = sizes.options.includes(Number(query.per))
    ? Number(query.per)
    : sizes.default;
  const pages = Math.max(1, Math.ceil(total / size));

  if (total <= Math.min(...sizes.options)) return null;

  const href = (next: { page?: number; per?: number }) => {
    const nextPer = next.per ?? size;
    return withQuery(pathname, {
      ...query,
      page: next.page && next.page > 1 ? String(next.page) : null,
      per: nextPer === sizes.default ? null : String(nextPer),
    });
  };

  // Stays on the page with the first one shown now.
  function resize(value: string) {
    const per = Number(value);
    const first = (page - 1) * size;
    startTransition(() =>
      router.push(href({ page: Math.floor(first / per) + 1, per }))
    );
  }

  const from = Math.min((page - 1) * size + 1, total);
  const to = Math.min(page * size, total);

  return (
    <Reveal
      as='nav'
      aria-label='Pages'
      className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2'
    >
      <p className='text-xs text-muted-foreground tabular-nums'>
        {page > pages ? `${total} in all` : `${from}–${to} of ${total}`}
      </p>

      {pages > 1 && (
        <div className='flex items-center gap-1'>
          <PageButton
            href={
              page > 1 ? href({ page: Math.min(page, pages + 1) - 1 }) : null
            }
            label='Previous page'
          >
            <ChevronLeftIcon />
            <span className='hidden sm:inline'>Previous</span>
          </PageButton>

          {/* Every number fits on wider screens; on phones, where they are. */}
          <ol className='hidden items-center gap-1 sm:flex'>
            {pageItems(page, pages).map((item, index) =>
              item === null ? (
                <li
                  key={`gap-${index}`}
                  aria-hidden
                  className='flex size-7 items-center justify-center text-muted-foreground'
                >
                  <MoreHorizontalIcon className='size-3.5' />
                </li>
              ) : (
                <li key={item}>
                  <Button
                    variant={item === page ? 'outline' : 'ghost'}
                    size='icon'
                    className='w-auto min-w-7 px-1.5 tabular-nums'
                    asChild
                  >
                    <Link
                      href={href({ page: item })}
                      aria-label={`Page ${item}`}
                      aria-current={item === page ? 'page' : undefined}
                    >
                      {item}
                    </Link>
                  </Button>
                </li>
              )
            )}
          </ol>
          <span className='px-2 text-xs text-muted-foreground tabular-nums sm:hidden'>
            {Math.min(page, pages)} / {pages}
          </span>

          <PageButton
            href={page < pages ? href({ page: page + 1 }) : null}
            label='Next page'
          >
            <span className='hidden sm:inline'>Next</span>
            <ChevronRightIcon />
          </PageButton>
        </div>
      )}

      <div className='flex items-center gap-2'>
        {pending && (
          <Loader2Icon className='size-3.5 animate-spin text-muted-foreground' />
        )}
        <Select value={String(size)} onValueChange={resize}>
          <SelectTrigger className='w-auto' aria-label='How many on a page'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sizes.options.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option} per page
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Reveal>
  );
}

/** Previous or Next: a link, or greyed out at either end. */
function PageButton({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <Button variant='ghost' disabled aria-label={label}>
        {children}
      </Button>
    );
  }
  return (
    <Button variant='ghost' asChild>
      <Link href={href} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}
