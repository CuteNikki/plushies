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
 * How many of each their page shows; the rest are on pages of their own,
 * e.g. /dashboard/users/[id]/comments.
 */
export const USER_PAGE_SHOWN = {
  likes: 6,
  comments: 5,
  activity: 10,
  /** Of the reports about them, and of the ones they sent. */
  reports: 3,
};

/**
 * One account for its page: sign-in methods, who banned them, and the
 * latest of the plushies they like and of their comments.
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
        take: USER_PAGE_SHOWN.comments,
        select: commentRowSelect,
      },
      _count: {
        select: { comments: { where: { deletedAt: null } }, likes: true },
      },
      likes: {
        orderBy: { createdAt: 'desc' },
        take: USER_PAGE_SHOWN.likes,
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

/** Just who they are, for the pages under theirs. */
export function getUserName(id: string) {
  return db.user.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
}

/** Plushies they like on their likes page, a page at a time. */
export const LIKES_PAGE_SIZE = 48;

/** The plushies they like, most recent first, a page at a time from 1. */
export async function getUserLikes(userId: string, page: number) {
  const [likes, total] = await Promise.all([
    db.plushieLike.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { plushieId: 'asc' }],
      skip: (page - 1) * LIKES_PAGE_SIZE,
      take: LIKES_PAGE_SIZE,
      select: {
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
    }),
    db.plushieLike.count({ where: { userId } }),
  ]);
  return {
    plushies: likes.map(({ plushie }) => plushie),
    total,
    more: page * LIKES_PAGE_SIZE < total,
  };
}
