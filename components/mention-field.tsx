'use client';

import { useId, useRef, useState } from 'react';

import type { Plushie } from '@/data/plushies';
import { cn } from '@/lib/utils';

import { PlushiePhoto } from '@/components/plushie-photo';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export type MentionOption = Pick<Plushie, 'id' | 'name' | 'thumbnail'>;

const MAX_OPTIONS = 6;

/** The @ being typed before the cursor, and what follows it so far. */
function typedMention(text: string, cursor: number) {
  const match = /(?:^|[^\p{L}\p{N}_])@([^@\n]{0,40})$/u.exec(
    text.slice(0, cursor)
  );
  if (!match) return null;
  return { start: cursor - match[1].length - 1, query: match[1] };
}

type FieldProps = Omit<
  React.ComponentProps<'textarea'> & React.ComponentProps<'input'>,
  'value' | 'onChange' | 'onKeyDown'
>;

/**
 * A text field where typing @ suggests plushies to mention. Picking one
 * writes @Name; the form turns that into a mention when saving.
 */
export function MentionField({
  multiline,
  value,
  onValueChange,
  options,
  onPick,
  containerClassName,
  onKeyDown,
  ...props
}: FieldProps & {
  multiline?: boolean;
  value: string;
  onValueChange: (value: string) => void;
  options: MentionOption[];
  /** Which plushie was picked, for when several share a name. */
  onPick?: (id: string) => void;
  containerClassName?: string;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
}) {
  const listId = useId();
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState<number | null>(null);

  const typed = cursor === null ? null : typedMention(value, cursor);
  const query = typed?.query.toLowerCase() ?? '';
  const matches =
    typed && typed.start !== dismissed
      ? options
          .filter((option) => option.name.toLowerCase().startsWith(query))
          .slice(0, MAX_OPTIONS)
      : [];
  const open = matches.length > 0;
  const highlighted = Math.min(active, matches.length - 1);

  function track(element: HTMLTextAreaElement | HTMLInputElement) {
    setCursor(
      element.selectionStart === element.selectionEnd
        ? element.selectionStart
        : null
    );
  }

  function pick(option: MentionOption) {
    if (!typed || cursor === null) return;
    const inserted = `@${option.name} `;
    // A space already after the cursor isn't doubled.
    const after = value.slice(cursor).replace(/^ /, '');
    onValueChange(value.slice(0, typed.start) + inserted + after);
    onPick?.(option.id);
    const position = typed.start + inserted.length;
    setCursor(position);
    requestAnimationFrame(() =>
      ref.current?.setSelectionRange(position, position)
    );
  }

  const Field = multiline ? Textarea : Input;

  return (
    <div className={cn('relative', containerClassName)}>
      <Field
        {...props}
        ref={ref}
        value={value}
        role='combobox'
        aria-autocomplete='list'
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open ? `${listId}-${matches[highlighted].id}` : undefined
        }
        onChange={(event) => {
          onValueChange(event.target.value);
          setActive(0);
          setDismissed(null);
          track(event.target);
        }}
        onSelect={(event) => track(event.currentTarget)}
        onBlur={() => setCursor(null)}
        onKeyDown={(event) => {
          // Plain Enter picks; with Ctrl or Cmd it's the field's, e.g. sending.
          const picking =
            open &&
            ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(
              event.key
            ) &&
            !event.ctrlKey &&
            !event.metaKey;
          if (!picking) return onKeyDown?.(event);
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const by = event.key === 'ArrowDown' ? 1 : -1;
            setActive((highlighted + by + matches.length) % matches.length);
          } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            pick(matches[highlighted]);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            setDismissed(typed!.start);
          }
        }}
      />
      {open && (
        <ul
          id={listId}
          role='listbox'
          aria-label='Plushies to mention'
          className='absolute inset-x-0 top-full z-20 mt-1 max-w-72 overflow-hidden rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10'
        >
          {matches.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${option.id}`}
              role='option'
              aria-selected={index === highlighted}
              // Before the field loses focus, which would close the list.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(option);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm',
                index === highlighted && 'bg-accent text-accent-foreground'
              )}
            >
              <PlushiePhoto
                plushie={option}
                sizes='24px'
                compact
                className='size-6 shrink-0 rounded-md'
              />
              <span className='truncate'>{option.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
