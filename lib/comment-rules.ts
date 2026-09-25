// Shared by the comment form and the server, so keep this free of server-only imports.

import type { Role } from '@/lib/generated/prisma/enums';

/** The longest a comment can be, in characters. */
export const COMMENT_MAX = 1000;

/** Top-level comments loaded at a time; each comes with all its replies. */
export const COMMENTS_PER_PAGE = 20;

/** Direct replies shown under a comment before "Show more replies". */
export const REPLIES_SHOWN = 3;

/** How many comments an account can post per minute. Edits don't count. */
export const COMMENTS_PER_MINUTE = 5;

// Anything that reads as a web address: a scheme, www., a Discord invite, or
// a name with a common ending like example.com. Other dots, like "e.g." or
// "3.5", stay allowed.
const linkPatterns = [
  /[a-z][a-z0-9+.-]*:\/\//i,
  /\bwww\./i,
  /\bdiscord(?:app)?\.(?:gg|com\/invite)\b/i,
  /\b[a-z0-9-]+\.(?:com|net|org|io|gg|co|me|xyz|dev|app|ly|de|uk|eu|ru|tk|info|biz|link|site|online|shop|store|to|tv|be|gl|us|cc|ws|click|top)\b/i,
];

export function hasLink(text: string) {
  return linkPatterns.some((pattern) => pattern.test(text));
}

/** e.g. 'the reply' or 'the 3 replies', for questions about deleting. */
export function theReplies(count: number) {
  return count === 1 ? 'the reply' : `the ${count} replies`;
}

/** What's wrong with a comment's text, or null if it's fine. */
export function commentError(body: string) {
  if (!body.trim()) return 'Write something first';
  if (body.length > COMMENT_MAX) {
    return `Keep it under ${COMMENT_MAX} characters`;
  }
  if (hasLink(body)) return 'Links aren’t allowed in comments';
  return null;
}

export type CommentAuthor = {
  id: string;
  name: string;
  image: string | null;
  role: Role;
};

/** A comment as the plushie page shows it. */
export type CommentView = {
  id: string;
  /** Empty when deleted. */
  body: string;
  /** Null when deleted. */
  author: CommentAuthor | null;
  createdAt: string;
  editedAt: string | null;
  /** Deleted while it had replies, so it stays as "[deleted]". */
  deleted: boolean;
  /**
   * Hidden after being reported, until an editor or admin looks at it. Only
   * they and its author get its text and author; others see it's hidden.
   */
  hidden: boolean;
  /** Reported by the viewer, who can't report it again. */
  reported: boolean;
  /** The comments answering this one, oldest first, with theirs. */
  replies: CommentView[];
};

/**
 * What the signed-in viewer can do, and why not if they can't. For an admin
 * viewing the site as someone, it's what that person can do, so the page
 * looks the way it does for them; `viewingAs` turns all of it off.
 */
export type CommentViewer = {
  id: string | null;
  /** Why they can't comment, or null if they can. */
  blocked: 'signed-out' | 'unverified' | null;
  /**
   * An admin viewing the site as them: everything shows, but nothing can be
   * written, changed or reported.
   */
  viewingAs: boolean;
  /** Editors and admins can delete anyone's comments. */
  canModerate: boolean;
  /**
   * Admins can also delete a comment with every reply under it, so nothing
   * of it shows, not even "Comment deleted".
   */
  canPurge: boolean;
};

export type CommentsPage = {
  /** Top-level comments, newest first. */
  threads: CommentView[];
  /** Pass back as ?cursor= for the next page; null on the last one. */
  nextCursor: string | null;
  /** Comments on the plushie, replies included, deleted ones not. */
  total: number;
  viewer: CommentViewer;
};
