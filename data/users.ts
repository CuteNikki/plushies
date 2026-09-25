import 'server-only';

import { commentRowSelect } from '@/data/comment-rows';
import { db } from '@/lib/db';
import { Role } from '@/lib/permissions';

export const userSorts = ['oldest', 'newest', 'name'] as const;
export const userRoles = ['all', 'admin', 'editor', 'user', 'banned'] as const;

/**
 * Accounts with their sign-in methods: everyone, or only one role or the
 * banned ones, and only names or emails matching `q`.
 */
export async function getUsers({
  q = null,
  role = 'all',
  sort = 'oldest',
}: {
  q?: string | null;
  role?: (typeof userRoles)[number];
  sort?: (typeof userSorts)[number];
} = {}) {
  const contains = q && { contains: q, mode: 'insensitive' as const };
  const roles = { admin: Role.ADMIN, editor: Role.EDITOR, user: Role.USER };
  return db.user.findMany({
    where: {
      AND: [
        contains ? { OR: [{ name: contains }, { email: contains }] } : {},
        role === 'banned'
          ? {
              banned: true,
              OR: [{ banExpires: null }, { banExpires: { gt: new Date() } }],
            }
          : role === 'all'
            ? {}
            : { role: roles[role] },
      ],
    },
    orderBy:
      sort === 'name'
        ? [{ name: 'asc' }, { createdAt: 'asc' }]
        : { createdAt: sort === 'newest' ? 'desc' : 'asc' },
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
