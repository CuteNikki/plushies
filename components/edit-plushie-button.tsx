'use client';

import { Pencil } from 'lucide-react';
import Link from 'next/link';

import { authClient } from '@/lib/auth-client';
import { canEditPlushies } from '@/lib/permissions';

import { Button } from '@/components/ui/button';

export function EditPlushieButton({ id }: { id: string }) {
  const { data: session } = authClient.useSession();
  if (!canEditPlushies(session?.user.role)) return null;

  return (
    <Button variant='outline' size='sm' asChild>
      <Link href={`/dashboard/plushies/${id}`}>
        <Pencil />
        Edit
      </Link>
    </Button>
  );
}
