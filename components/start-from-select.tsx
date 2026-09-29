'use client';

import { useRouter } from 'next/navigation';

import type { Plushie } from '@/data/plushies';

import { PlushiePhoto } from '@/components/plushie-photo';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BLANK = 'blank';

/**
 * Picks a plushie for the new-plushie form to start from, e.g. another of the
 * same species or group, or none for an empty form. Switching starts over.
 */
export function StartFromSelect({
  plushies,
  value,
}: {
  plushies: Pick<Plushie, 'id' | 'name' | 'thumbnail'>[];
  /** The plushie it starts from now, if any. */
  value?: string;
}) {
  const router = useRouter();

  return (
    <Select
      value={value ?? BLANK}
      onValueChange={(id) =>
        router.replace(
          id === BLANK
            ? '/dashboard/plushies/new'
            : `/dashboard/plushies/new?from=${id}`,
          { scroll: false }
        )
      }
    >
      <SelectTrigger id='start-from' className='w-full sm:w-64'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={BLANK}>An empty form</SelectItem>
        {plushies.map((plushie) => (
          <SelectItem key={plushie.id} value={plushie.id}>
            <PlushiePhoto
              plushie={plushie}
              sizes='20px'
              compact
              className='size-5 rounded-full'
            />
            {plushie.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
