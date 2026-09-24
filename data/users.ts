import 'server-only';

import { db } from '@/lib/db';

/** Everyone, oldest account first, with their sign-in methods. */
export async function getUsers() {
  return db.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: { accounts: { select: { providerId: true } } },
  });
}

/**
 * One account for its page: sign-in methods, who banned them, and the
 * plushies they like, most recent first.
 */
export async function getUser(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      accounts: { select: { providerId: true } },
      bannedBy: { select: { id: true, name: true } },
      likes: {
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          plushie: {
            select: {
              id: true,
              slug: true,
              name: true,
              thumbnailKey: true,
              thumbnailUrl: true,
            },
          },
        },
      },
    },
  });
}
