import 'server-only';

import type { Prisma } from '@/lib/generated/prisma/client';

/** What a comment row in the dashboard shows, as Prisma selects it. */
export const commentRowSelect = {
  id: true,
  body: true,
  createdAt: true,
  editedAt: true,
  author: { select: { id: true, name: true } },
  plushie: {
    select: {
      id: true,
      slug: true,
      name: true,
      thumbnailKey: true,
      thumbnailUrl: true,
    },
  },
  parent: {
    select: {
      body: true,
      deletedAt: true,
      author: { select: { id: true, name: true } },
    },
  },
  _count: { select: { replies: true } },
} satisfies Prisma.CommentSelect;

type Row = Prisma.CommentGetPayload<{ select: typeof commentRowSelect }>;

export type CommentRowData = ReturnType<typeof toCommentRow>;

export function toCommentRow({ parent, _count, plushie, ...comment }: Row) {
  return {
    ...comment,
    plushie: {
      id: plushie.id,
      slug: plushie.slug,
      name: plushie.name,
      thumbnail:
        plushie.thumbnailKey && plushie.thumbnailUrl
          ? { key: plushie.thumbnailKey, url: plushie.thumbnailUrl }
          : null,
    },
    createdAt: comment.createdAt.toISOString(),
    editedAt: comment.editedAt?.toISOString() ?? null,
    /**
     * The comment it answers, if it's a reply. Without author and text when
     * that one was deleted.
     */
    replyTo: parent
      ? parent.deletedAt
        ? { author: null, body: null }
        : { author: parent.author, body: parent.body }
      : null,
    replies: _count.replies,
  };
}
