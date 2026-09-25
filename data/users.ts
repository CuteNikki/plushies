import 'server-only';

import { commentRowSelect } from '@/data/comment-rows';
import { db } from '@/lib/db';

/** Everyone, oldest account first, with their sign-in methods. */
export async function getUsers() {
  return db.user.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      accounts: { select: { providerId: true } },
      _count: { select: { passkeys: true } },
    },
  });
}

/**
 * One account for its page: sign-in methods, who banned them, the plushies
 * they like and their latest comments, most recent first.
 */
export async function getUser(id: string) {
  return db.user.findUnique({
    where: { id },
    include: {
      accounts: { select: { providerId: true } },
      passkeys: { select: { id: true } },
      bannedBy: { select: { id: true, name: true } },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: commentRowSelect,
      },
      _count: { select: { comments: { where: { deletedAt: null } } } },
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
