import type { Metadata } from 'next';

import { ListOrderedIcon } from 'lucide-react';

import { getPlushies } from '@/data/plushies';
import { arrange } from '@/lib/order';
import { requireEditor } from '@/lib/session';

import { ArrangeList, type ArrangeItem } from '@/components/arrange-list';
import { BackButton } from '@/components/back-button';
import { EmptyState } from '@/components/empty-state';
import { Reveal } from '@/components/motion';

export const metadata: Metadata = { title: 'Arrange Plushies' };

export default async function ArrangePlushiesPage() {
  await requireEditor();
  const plushies = await getPlushies();
  // Just what the list shows, to keep what's sent to the browser small.
  const pick = ({ id, name, thumbnail }: (typeof plushies)[number]) => ({
    id,
    name,
    thumbnail,
  });
  const items: ArrangeItem[] = arrange(plushies).map((item) =>
    item.kind === 'group'
      ? {
          kind: 'group',
          group: { id: item.group.id, name: item.group.name },
          plushies: item.plushies.map(pick),
        }
      : { kind: 'plushie', plushie: pick(item.plushie) }
  );

  // Starts over when the groups or order change elsewhere, e.g. a new
  // group, but not after its own saves, which leave it as it was.
  const layoutKey = items
    .map((item) =>
      item.kind === 'group'
        ? `${item.group.id}[${item.plushies.map((p) => p.id)}]`
        : item.plushie.id
    )
    .join();

  return (
    <div className='mx-auto flex w-full max-w-2xl flex-col gap-6'>
      <Reveal className='flex'>
        <BackButton href='/dashboard/plushies'>Plushies</BackButton>
      </Reveal>
      <Reveal>
        <h1 className='font-heading text-4xl font-semibold tracking-tight'>
          Arrange Plushies
        </h1>
        <p className='text-pretty text-muted-foreground'>
          The order on the home page. Drag by the handle or use the arrows;
          changes save right away. Plushies in a group stay together, and you
          choose a plushie&rsquo;s group in their form.
        </p>
      </Reveal>
      {items.length > 0 ? (
        <Reveal>
          <ArrangeList key={layoutKey} initial={items} />
        </Reveal>
      ) : (
        <Reveal>
          <EmptyState icon={ListOrderedIcon}>No plushies yet.</EmptyState>
        </Reveal>
      )}
    </div>
  );
}
