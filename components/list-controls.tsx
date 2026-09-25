'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';

import { Loader2Icon, SearchIcon } from 'lucide-react';

import { withQuery } from '@/lib/list-params';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ListSelect = {
  /** The URL parameter it sets, e.g. 'sort'. */
  param: string;
  label: string;
  /** The first one is the default, which leaves the parameter out. */
  options: readonly { value: string; label: string }[];
};

/**
 * A search box and dropdowns above a list. They live in the URL, so the page
 * filters on the server, links keep them, and paging starts over when one
 * changes.
 */
export function ListControls({
  query,
  search,
  selects = [],
}: {
  /** The page's current query, from its searchParams. */
  query: Record<string, string>;
  /** Sets `q`. */
  search?: { label: string; placeholder: string };
  selects?: ListSelect[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(query.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function go(changes: Record<string, string | null>) {
    // A new search or order starts at the first page.
    const next = { ...query, page: null, ...changes };
    startTransition(() =>
      router.replace(withQuery(pathname, next), { scroll: false })
    );
  }

  // Searches once typing pauses, not on every key.
  function type(value: string) {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ q: value.trim() || null }), 300);
  }
  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className='flex flex-wrap gap-2'>
      {search && (
        <div className='relative min-w-48 flex-1'>
          {pending ? (
            <Loader2Icon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground' />
          ) : (
            <SearchIcon className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          )}
          <Input
            type='search'
            value={text}
            onChange={(event) => type(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              clearTimeout(timer.current);
              go({ q: text.trim() || null });
            }}
            placeholder={search.placeholder}
            aria-label={search.label}
            className='pl-9'
          />
        </div>
      )}
      {selects.map((select) => (
        <Select
          key={select.param}
          value={query[select.param] ?? select.options[0].value}
          onValueChange={(value) =>
            go({
              [select.param]: value === select.options[0].value ? null : value,
            })
          }
        >
          <SelectTrigger className='w-auto min-w-36' aria-label={select.label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {select.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  );
}
