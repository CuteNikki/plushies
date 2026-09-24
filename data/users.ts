import 'server-only';

import { db } from '@/lib/db';

/** Everyone, oldest account first, with their sign-in methods. */
export async function getUsers() {
  return db.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { accounts: { select: { providerId: true } } },
  });
}
