'use client';

import { useState } from 'react';

import { daysInMonth, parseBirthday, toBirthdayString } from '@/lib/birthday';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

/** Select items can't have an empty value, so this stands for "unknown". */
const UNKNOWN = 'unknown';

const monthNames = Array.from({ length: 12 }, (_, index) =>
  new Date(2000, index, 1).toLocaleDateString('en-US', { month: 'long' })
);

/**
 * Year, and optionally month and day, for as much of the birthday as is
 * known. Submits a hidden `birthday` field: 'YYYY', 'YYYY-MM' or 'YYYY-MM-DD'.
 */
export function BirthdayField({
  defaultValue,
}: {
  defaultValue?: string | null;
}) {
  const initial = defaultValue ? parseBirthday(defaultValue) : null;
  const [year, setYear] = useState(initial ? String(initial.year) : '');
  const [month, setMonth] = useState(initial?.month ?? null);
  const [day, setDay] = useState(initial?.day ?? null);

  const yearNumber = /^\d{4}$/.test(year) ? Number(year) : null;
  // Day only counts with a month, and must exist in it (no 30 February).
  const days = yearNumber && month ? daysInMonth(yearNumber, month) : 31;
  const validDay = month && day && day <= days ? day : null;
  const value = yearNumber
    ? toBirthdayString({
        year: yearNumber,
        month: month ?? undefined,
        day: validDay ?? undefined,
      })
    : '';

  return (
    <fieldset className='flex flex-col gap-2'>
      {/* Same look as the other fields' labels. */}
      <legend className='mb-2 text-xs/relaxed leading-none font-medium'>
        Birthday
      </legend>
      <input type='hidden' name='birthday' value={value} />
      <div className='grid grid-cols-[5rem_1fr_4.5rem] gap-2'>
        <div className='flex flex-col gap-1'>
          <Label htmlFor='birthday-year' className='sr-only'>
            Year
          </Label>
          <Input
            id='birthday-year'
            inputMode='numeric'
            placeholder='Year'
            maxLength={4}
            value={year}
            onChange={(event) =>
              setYear(event.target.value.replace(/\D/g, '').slice(0, 4))
            }
          />
        </div>
        <Select
          value={month ? String(month) : UNKNOWN}
          disabled={!yearNumber}
          onValueChange={(next) =>
            setMonth(next === UNKNOWN ? null : Number(next))
          }
        >
          <SelectTrigger className='w-full' aria-label='Month'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNKNOWN}>—</SelectItem>
            {monthNames.map((name, index) => (
              <SelectItem key={name} value={String(index + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={validDay ? String(validDay) : UNKNOWN}
          disabled={!yearNumber || !month}
          onValueChange={(next) =>
            setDay(next === UNKNOWN ? null : Number(next))
          }
        >
          <SelectTrigger className='w-full' aria-label='Day'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNKNOWN}>—</SelectItem>
            {Array.from({ length: days }, (_, index) => (
              <SelectItem key={index} value={String(index + 1)}>
                {index + 1}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className='text-xs text-muted-foreground'>
        Just the year, or year and month, is fine too.
      </p>
    </fieldset>
  );
}
