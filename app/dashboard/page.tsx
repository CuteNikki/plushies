import { Pencil, Plus, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { getPlushies } from '@/lib/plushies';
import { requireEditor } from '@/lib/session';

import { Reveal } from '@/components/motion';
import { PlushiePhoto } from '@/components/plushie-photo';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Edit Plushies' };

export default async function AdminPage() {
  const session = await requireEditor();
  const plushies = await getPlushies();

  return (
    <div className='flex flex-col gap-6'>
      <Reveal className='flex flex-wrap items-end justify-between gap-4'>
        <div>
          <h1 className='font-heading text-4xl font-semibold tracking-tight'>
            Edit Plushies
          </h1>
          <p className='text-muted-foreground'>
            Add new friends or update the ones you have.
          </p>
        </div>
        <div className='flex gap-2'>
          {session.user.role === 'admin' && (
            <Button variant='outline' asChild>
              <Link href='/dashboard/users'>
                <Users />
                Users
              </Link>
            </Button>
          )}
          <Button asChild>
            <Link href='/dashboard/plushies/new'>
              <Plus />
              New Plushie
            </Link>
          </Button>
        </div>
      </Reveal>

      <ul className='flex flex-col divide-y rounded-xl ring-1 ring-foreground/10'>
        {plushies.map((plushie) => (
          <Reveal
            as='li'
            key={plushie.id}
            className='flex items-center gap-4 p-3'
          >
            <PlushiePhoto
              plushie={plushie}
              sizes='56px'
              compact
              className='size-14 shrink-0 rounded-xl'
            />
            <div className='min-w-0 flex-1'>
              <Link
                href={`/plushies/${plushie.slug}`}
                className='font-heading font-semibold hover:underline'
              >
                {plushie.name}
              </Link>
              <p className='text-sm text-muted-foreground'>
                {[
                  plushie.species,
                  `${plushie.gallery.length + (plushie.thumbnail ? 1 : 0)} photos`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <Button variant='outline' size='sm' asChild>
              <Link href={`/dashboard/plushies/${plushie.id}`}>
                <Pencil />
                Edit
              </Link>
            </Button>
          </Reveal>
        ))}
      </ul>
    </div>
  );
}
