'use client';

import Link from 'next/link';
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import {
  ArrowLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeOffIcon,
  FlagIcon,
  LinkIcon,
  Loader2Icon,
  MessageCircleIcon,
  PencilIcon,
  ReplyIcon,
  Trash2Icon,
  UserIcon,
  UserRoundXIcon,
} from 'lucide-react';

import { addComment, deleteComment, editComment } from '@/actions/comments';
import { authClient } from '@/lib/auth-client';
import {
  COMMENT_MAX,
  commentError,
  REPLIES_SHOWN,
  theReplies,
  type CommentsPage,
  type CommentView,
  type CommentViewer,
} from '@/lib/comment-rules';
import { Role } from '@/lib/generated/prisma/enums';
import { roleLabels, VIEWING_AS_MESSAGE } from '@/lib/permissions';
import { cn } from '@/lib/utils';

import { useConfirm } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import {
  ItemMenu,
  ItemMenuButton,
  ItemMenuItem,
  ItemMenuSeparator,
} from '@/components/item-menu';
import { LocalTime } from '@/components/local-time';
import { ReportDialog, type ReportTarget } from '@/components/report-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { UserAvatar } from '@/components/user-avatar';

/**
 * Levels of replies shown under a comment: fewer on phones, where each level
 * takes a bigger share of the width. Deeper ones are behind "Continue this
 * thread", which opens them in place, starting back at the thread's left
 * edge, so text and the reply box keep their room.
 */
const MAX_DEPTH = 3;
const MAX_DEPTH_PHONE = 2;

/** Tailwind's sm breakpoint: wider than this isn't a phone. */
const wide = '(min-width: 40rem)';

function useMaxDepth() {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(wide);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    () => (matchMedia(wide).matches ? MAX_DEPTH : MAX_DEPTH_PHONE),
    // Comments only load in the browser, so this is never shown.
    () => MAX_DEPTH
  );
}

/**
 * How far each level of replies moves right: the margin and padding of
 * .comment-replies in globals.css. An opened "Continue this thread" moves back left
 * by this much per level.
 */
const INDENT = 'calc(1.75rem + 2px)';

// Wraps rather than running past the edge on narrow screens. The line to
// it curves in at the middle of its first line, allowing for its border.
const wrappingButton =
  'h-auto min-h-6 max-w-full self-start py-1 text-left whitespace-normal [--reply-border:1px] [--reply-center:0.75rem]';

/** Every reply under a comment, however deep, not counting deleted ones. */
function countReplies(comment: CommentView): number {
  return comment.replies.reduce(
    (sum, reply) => sum + (reply.deleted ? 0 : 1) + countReplies(reply),
    0
  );
}

/** The comment with this id in `comment`'s part of the thread, if it's there. */
function findIn(comment: CommentView, id: string): CommentView | undefined {
  if (comment.id === id) return comment;
  for (const reply of comment.replies) {
    const found = findIn(reply, id);
    if (found) return found;
  }
}

/** The comment a link points to, as in #comment-…, if there is one. */
function linkedComment() {
  const match = /^#comment-(.+)$/.exec(location.hash);
  return match ? decodeURIComponent(match[1]) : null;
}

/** The ids from the top of the comment's thread down to it, if it's here. */
function pathTo(comments: CommentView[], id: string): string[] | null {
  for (const comment of comments) {
    if (comment.id === id) return [id];
    const below = pathTo(comment.replies, id);
    if (below) return [comment.id, ...below];
  }
  return null;
}

/**
 * The linked comment and the ones above it, while it's highlighted. The
 * replies and threads they're hidden behind start out open.
 */
const FocusContext = createContext<{ id: string; path: string[] } | null>(null);

/**
 * Set inside an opened "Continue this thread" box: going further shows the
 * deeper replies in that same box, rather than in a box inside it.
 */
const ContinueContext = createContext<((id: string) => void) | null>(null);

/** Applies `change` to every comment in the tree, replies included. */
function mapTree(
  comments: CommentView[],
  change: (comment: CommentView) => CommentView
): CommentView[] {
  return comments.map((comment) => {
    const changed = change(comment);
    return { ...changed, replies: mapTree(changed.replies, change) };
  });
}

/** Takes the comments with these ids, and their replies, out of the tree. */
function withoutIds(comments: CommentView[], ids: string[]): CommentView[] {
  return comments
    .filter((comment) => !ids.includes(comment.id))
    .map((comment) => ({
      ...comment,
      replies: withoutIds(comment.replies, ids),
    }));
}

/**
 * A plushie's comments. The page around it is built ahead of time, so they
 * load here, again whenever someone signs in or out.
 */
export function Comments({
  plushieId,
  slug,
}: {
  plushieId: string;
  slug: string;
}) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const userId = session?.user.id;
  const [page, setPage] = useState<CommentsPage | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, startLoadingMore] = useTransition();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ id: string; path: string[] } | null>(
    null
  );
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const [ask, confirmDialog] = useConfirm();

  useEffect(() => {
    // Waits for the session, so the page loads once with the right viewer.
    if (sessionPending) return;
    let current = true;
    // A linked comment loads with the rest, however far down its thread is.
    const linked = linkedComment();
    fetchPage(plushieId, null, linked)
      .then((fresh) => {
        if (!current) return;
        setPage(fresh);
        if (!linked) return;
        const path = pathTo(fresh.threads, linked);
        if (path) setFocus({ id: linked, path });
        else toast.error('That comment isn’t here anymore');
      })
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [plushieId, userId, sessionPending]);

  // Its replies and threads open as it renders; then it's scrolled to, and
  // flashes (.comment-linked) until this clears it.
  useEffect(() => {
    if (!focus) return;
    const element = document.getElementById(`comment-${focus.id}`);
    const scroll = () => element?.scrollIntoView({ block: 'center' });
    // Photos above it can still be loading, after coming from another page,
    // and push it back down. So it's kept in view while the page settles,
    // until they scroll or click themselves.
    const observer = new ResizeObserver(scroll);
    observer.observe(document.body);
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    const stop = () => {
      observer.disconnect();
      for (const event of events) removeEventListener(event, stop);
    };
    for (const event of events) {
      addEventListener(event, stop, { passive: true });
    }
    const settled = setTimeout(stop, 2000);
    const cleared = setTimeout(() => setFocus(null), 2500);
    return () => {
      stop();
      clearTimeout(settled);
      clearTimeout(cleared);
    };
  }, [focus]);

  function loadMore() {
    if (!page?.nextCursor) return;
    startLoadingMore(async () => {
      try {
        const more = await fetchPage(plushieId, page.nextCursor);
        setPage(
          (before) =>
            before && {
              ...more,
              // A thread can show up twice if comments came in meanwhile.
              threads: [
                ...before.threads,
                ...more.threads.filter(
                  (thread) => !before.threads.some((t) => t.id === thread.id)
                ),
              ],
            }
        );
      } catch {
        toast.error('Couldn’t load more comments, try again');
      }
    });
  }

  function added(comment: CommentView, parentId: string | null) {
    setPage(
      (before) =>
        before && {
          ...before,
          total: before.total + 1,
          threads: parentId
            ? mapTree(before.threads, (item) =>
                item.id === parentId
                  ? { ...item, replies: [...item.replies, comment] }
                  : item
              )
            : [comment, ...before.threads],
        }
    );
  }

  function edited(comment: CommentView) {
    setPage(
      (before) =>
        before && {
          ...before,
          threads: mapTree(before.threads, (item) =>
            item.id === comment.id
              ? { ...comment, replies: item.replies }
              : item
          ),
        }
    );
  }

  /**
   * Marks a comment they reported. If that hid it, it's hidden from them
   * too, unless they're an editor or admin: it can't be their own.
   */
  function reported(id: string, hidden: boolean) {
    setPage(
      (before) =>
        before && {
          ...before,
          threads: mapTree(before.threads, (item) =>
            item.id !== id
              ? item
              : hidden && !before.viewer.canModerate
                ? { ...item, reported: true, hidden, body: '', author: null }
                : { ...item, reported: true, hidden: hidden || item.hidden }
          ),
        }
    );
  }

  /**
   * Deletes a comment, after asking. Admins can tick "Erase completely" to
   * delete every reply under it too, so nothing of it stays on the page; for
   * a comment that's deleted already, that's the only way.
   */
  async function remove(comment: CommentView, own: boolean) {
    const whose = own ? 'your' : `${comment.author?.name}’s`;
    const replies = countReplies(comment);
    const logged = 'It’s logged in the activity, where it can be restored.';
    const confirmed = await ask({
      title: comment.deleted
        ? `Delete ${theReplies(replies)} under this deleted comment?`
        : `Delete ${whose} comment?`,
      description: comment.deleted
        ? `Nothing of them stays on the page. ${logged}`
        : !own
          ? logged
          : replies > 0
            ? 'The replies to it stay, under “Comment deleted”.'
            : 'This can’t be undone.',
      action: 'Delete',
      destructive: true,
      option:
        page?.viewer.canPurge && replies > 0 && !comment.deleted
          ? {
              label: 'Erase completely',
              destructive: true,
              description: `Also deletes ${theReplies(replies)} under it, without leaving “Comment deleted”. ${logged}`,
            }
          : undefined,
    });
    if (!confirmed) return;
    const result = await deleteComment(comment.id, {
      withReplies: comment.deleted || confirmed.option,
    });
    if (!result.ok) return void toast.error(result.error);
    const { removed, placeholder, counted } = result.removal;
    setPage(
      (before) =>
        before && {
          ...before,
          total: before.total - counted,
          threads: mapTree(withoutIds(before.threads, removed), (item) =>
            item.id === placeholder
              ? { ...item, body: '', author: null, deleted: true }
              : item
          ),
        }
    );
    toast.success('Comment deleted');
  }

  const maxDepth = useMaxDepth();
  const viewer = page?.viewer;
  const actions: Actions = {
    plushieId,
    maxDepth,
    viewer,
    editing,
    setEditing,
    replyingTo,
    setReplyingTo,
    added,
    edited,
    remove,
    report: setReporting,
  };

  return (
    // isolate: the opened boxes sit above the thread lines, but not above
    // anything outside the comments, like the sticky header.
    <section className='isolate flex flex-col gap-4' aria-labelledby='comments'>
      <h2 id='comments' className='font-heading text-2xl font-semibold'>
        Comments
        {page && page.total > 0 && (
          <span className='ml-2 text-base font-normal text-muted-foreground'>
            {page.total}
          </span>
        )}
      </h2>

      {viewer && (
        <Composer viewer={viewer} slug={slug}>
          <CommentForm
            label='Write a comment'
            submit='Comment'
            disabled={viewer.viewingAs}
            onSubmit={async (body) => {
              const result = await addComment(plushieId, { body });
              if (!result.ok) return result.error;
              added(result.comment, null);
            }}
          />
        </Composer>
      )}

      {failed ? (
        <Notice>
          Comments couldn&rsquo;t be loaded. Try reloading the page.
        </Notice>
      ) : !page ? (
        <CommentsSkeleton />
      ) : page.threads.length === 0 ? (
        <EmptyState icon={MessageCircleIcon}>
          No comments yet.
          {!viewer?.blocked && ' Be the first!'}
        </EmptyState>
      ) : (
        <FocusContext value={focus}>
          <ul className='flex flex-col gap-6'>
            {page.threads.map((thread) => (
              <li key={thread.id}>
                <Comment comment={thread} depth={0} actions={actions} />
              </li>
            ))}
          </ul>
        </FocusContext>
      )}

      {page?.nextCursor && (
        <Button
          variant='outline'
          className='self-center'
          disabled={loadingMore}
          onClick={loadMore}
        >
          {loadingMore && <Loader2Icon className='animate-spin' />}
          Show more comments
        </Button>
      )}
      {confirmDialog}
      <ReportDialog
        target={reporting}
        onReportedAction={reported}
        onCloseAction={() => setReporting(null)}
      />
    </section>
  );
}

async function fetchPage(
  plushieId: string,
  cursor: string | null,
  focus: string | null = null
) {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (focus) params.set('focus', focus);
  const query = params.size > 0 ? `?${params}` : '';
  const response = await fetch(`/api/plushies/${plushieId}/comments${query}`);
  if (!response.ok) throw new Error(`Comments failed: ${response.status}`);
  return (await response.json()) as CommentsPage;
}

type Actions = {
  plushieId: string;
  /** Levels of replies shown before "Continue this thread". */
  maxDepth: number;
  viewer: CommentViewer | undefined;
  editing: string | null;
  setEditing: (id: string | null) => void;
  replyingTo: string | null;
  setReplyingTo: (id: string | null) => void;
  added: (comment: CommentView, parentId: string | null) => void;
  edited: (comment: CommentView) => void;
  remove: (comment: CommentView, own: boolean) => Promise<void>;
  /** Opens the report form for a comment or its author. */
  report: (target: ReportTarget) => void;
};

/** A comment, with its replies nested under it, and theirs under them. */
function Comment({
  comment: first,
  depth,
  actions,
}: {
  comment: CommentView;
  /** Levels of replies it's under, counted from the thread's left edge. */
  depth: number;
  actions: Actions;
}) {
  // Deleted comments in a row, each the only reply to the one before, show
  // as one line and one level.
  let comment = first;
  let deletedInRow = first.deleted ? 1 : 0;
  while (
    comment.deleted &&
    comment.replies.length === 1 &&
    comment.replies[0].deleted
  ) {
    comment = comment.replies[0];
    deletedInRow++;
  }

  // Inside an opened box, going further happens in that box.
  const continueInBox = useContext(ContinueContext);
  // Open from the start if the linked comment is behind them.
  const focus = useContext(FocusContext);
  const [showAll, setShowAll] = useState(
    () =>
      !!focus &&
      comment.replies
        .slice(REPLIES_SHOWN)
        .some((reply) => focus.path.includes(reply.id))
  );
  const [continued, setContinued] = useState(
    () =>
      !!focus &&
      !continueInBox &&
      depth >= actions.maxDepth &&
      focus.id !== comment.id &&
      focus.path.includes(comment.id)
  );
  const continueThread = () =>
    continueInBox ? continueInBox(comment.id) : setContinued(true);
  const replying = actions.replyingTo === comment.id;
  // Replies this deep are behind "Continue this thread".
  const atLimit = depth >= actions.maxDepth;
  // All of them while replying, so the new reply shows up at the end.
  const hidden =
    atLimit || showAll || replying
      ? 0
      : Math.max(comment.replies.length - REPLIES_SHOWN, 0);
  const shown = atLimit
    ? []
    : comment.replies.slice(0, comment.replies.length - hidden);
  const deeper = atLimit && comment.replies.length > 0;
  const hasReplies = shown.length > 0 || hidden > 0 || deeper || replying;

  return (
    <div className='flex flex-col gap-4'>
      {comment.deleted ? (
        <div className='flex flex-wrap items-center gap-x-2'>
          <p className='text-sm text-muted-foreground'>
            {deletedInRow > 1
              ? `${deletedInRow} comments deleted`
              : 'Comment deleted'}
          </p>
          {/* Admins can clear it out, from the top of the row. */}
          {actions.viewer?.canPurge && (
            <Button
              variant='ghost'
              size='sm'
              className='text-destructive hover:text-destructive'
              disabled={actions.viewer.viewingAs}
              title={actions.viewer.viewingAs ? VIEWING_AS_MESSAGE : undefined}
              onClick={() => actions.remove(first, false)}
            >
              <Trash2Icon />
              Delete
            </Button>
          )}
        </div>
      ) : !comment.author ? (
        // Hidden after reports, from everyone but its author and editors or
        // admins. Its replies still show.
        <p className='text-sm text-muted-foreground'>
          Hidden while it’s reviewed
        </p>
      ) : (
        <CommentBody
          comment={comment}
          actions={actions}
          hasReplies={hasReplies}
        />
      )}
      {hasReplies && (
        <div className='comment-replies flex flex-col gap-4'>
          {shown.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              actions={actions}
            />
          ))}
          {hidden > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className={wrappingButton}
              onClick={() => setShowAll(true)}
            >
              Show {hidden} more {hidden === 1 ? 'reply' : 'replies'}
            </Button>
          )}
          {deeper && !continued && (
            <Button
              variant='ghost'
              size='sm'
              className={wrappingButton}
              onClick={continueThread}
            >
              Continue this thread
              <ChevronRightIcon />
            </Button>
          )}
          {deeper && continued && !continueInBox && (
            <ContinuedThread
              from={comment}
              depth={depth}
              actions={actions}
              onHide={() => setContinued(false)}
            />
          )}
          {replying && (
            <CommentForm
              label={`Reply to ${comment.author?.name}`}
              submit='Reply'
              autoFocus
              onCancel={() => actions.setReplyingTo(null)}
              onSubmit={async (body) => {
                const result = await addComment(actions.plushieId, {
                  body,
                  parentId: comment.id,
                });
                if (!result.ok) return result.error;
                actions.added(result.comment, comment.id);
                actions.setReplyingTo(null);
                // Too deep to show here, so open this part of the thread.
                if (atLimit) continueThread();
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * "Continue this thread", opened: the replies under `from`, in a box that
 * starts back at the thread's left edge, so they have room again. Going
 * further shows deeper replies in the same box, with Back to return.
 */
function ContinuedThread({
  from,
  depth,
  actions,
  onHide,
}: {
  from: CommentView;
  /** The level `from` is at, to move the box back to the left edge. */
  depth: number;
  actions: Actions;
  onHide: () => void;
}) {
  const focus = useContext(FocusContext);
  // The comments whose replies were opened, from the first to the shown one.
  // For a linked comment deeper down, as far as it takes to show it: each
  // step shows its replies to maxDepth levels, then the next step's.
  const [path, setPath] = useState(() => {
    const chain = focus?.path.slice(focus.path.indexOf(from.id)) ?? [];
    if (chain[0] !== from.id) return [from.id];
    const steps: string[] = [];
    for (let i = 0; i < chain.length - 1; i += actions.maxDepth + 1) {
      steps.push(chain[i]);
    }
    return steps;
  });
  const box = useRef<HTMLDivElement>(null);
  const moved = useRef(false);
  // Back to the start if the shown one was deleted meanwhile.
  const shown = findIn(from, path.at(-1)!) ?? from;

  useEffect(() => {
    // The box's content changed under the button that was pressed, so bring
    // its top back into view if it scrolled out.
    if (moved.current) box.current?.scrollIntoView({ block: 'nearest' });
  }, [path]);

  function go(next: string[]) {
    moved.current = true;
    setPath(next);
  }

  return (
    // Solid and on top, so the lines of the levels it covers stay behind it.
    <div
      ref={box}
      data-unthreaded
      className='relative z-10 flex scroll-mt-20 flex-col gap-4 rounded-xl bg-[color-mix(in_oklab,var(--muted)_40%,var(--background))] p-3 ring-1 ring-foreground/10'
      style={{ marginLeft: `calc(-${depth + 1} * ${INDENT})` }}
    >
      <div className='flex items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-1'>
          {path.length > 1 && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => go(path.slice(0, -1))}
            >
              <ArrowLeftIcon />
              Back
            </Button>
          )}
          <p className='text-xs text-muted-foreground'>
            {shown.author
              ? `Replies to ${shown.author.name}’s comment`
              : 'Replies to a deleted comment'}
          </p>
        </div>
        <Button variant='ghost' size='sm' onClick={onHide}>
          Hide
        </Button>
      </div>
      <ContinueContext value={(id) => go([...path, id])}>
        {shown.replies.map((reply) => (
          <Comment key={reply.id} comment={reply} depth={0} actions={actions} />
        ))}
      </ContinueContext>
    </div>
  );
}

/** A comment that isn't deleted: who wrote it, the text and what you can do. */
function CommentBody({
  comment,
  actions,
  hasReplies,
}: {
  comment: CommentView;
  actions: Actions;
  /** Starts the line down to its replies under the avatar. */
  hasReplies: boolean;
}) {
  const { viewer } = actions;
  const author = comment.author!;
  const own = !!viewer?.id && viewer.id === author.id;
  const canWrite = viewer && !viewer.blocked;
  const isEditing = actions.editing === comment.id;
  const linked = useContext(FocusContext)?.id === comment.id;
  const canDelete = own || viewer?.canModerate;
  const canReport = canWrite && !own;
  // Viewing as someone: what they could do shows, but can't be used.
  const readOnly = !!viewer?.viewingAs;
  const off = readOnly ? VIEWING_AS_MESSAGE : undefined;
  // Admins can open the author's account from their name and picture.
  const account = viewer?.canPurge ? `/dashboard/users/${author.id}` : null;

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(done);
    } catch {
      toast.error('Couldn’t copy it, try again');
    }
  }

  return (
    // Its actions on right-click too, except while it's being edited, so
    // the text box keeps the browser's menu, e.g. to paste.
    <ItemMenu
      label={`Actions for ${author.name}’s comment`}
      disabled={isEditing}
      tint={false}
      className='comment-item'
      items={
        <>
          {canWrite && (
            <ItemMenuItem
              icon={ReplyIcon}
              disabled={readOnly}
              onSelect={() => actions.setReplyingTo(comment.id)}
            >
              Reply
            </ItemMenuItem>
          )}
          {own && canWrite && (
            <ItemMenuItem
              icon={PencilIcon}
              disabled={readOnly}
              onSelect={() => actions.setEditing(comment.id)}
            >
              Edit
            </ItemMenuItem>
          )}
          <ItemMenuItem
            icon={CopyIcon}
            onSelect={() => copy(comment.body, 'Comment copied')}
          >
            Copy text
          </ItemMenuItem>
          <ItemMenuItem
            icon={LinkIcon}
            onSelect={() =>
              copy(
                new URL(`#comment-${comment.id}`, location.href).href,
                'Link copied'
              )
            }
          >
            Copy link
          </ItemMenuItem>
          {account && (
            <ItemMenuItem icon={UserIcon} href={account}>
              View {author.name}’s account
            </ItemMenuItem>
          )}
          {canReport && (
            <>
              <ItemMenuSeparator />
              <ItemMenuItem
                icon={FlagIcon}
                disabled={readOnly || comment.reported}
                onSelect={() =>
                  actions.report({
                    kind: 'comment',
                    id: comment.id,
                    authorName: author.name,
                  })
                }
              >
                {comment.reported ? 'Comment reported' : 'Report comment'}
              </ItemMenuItem>
              {/* E.g. for their name or picture, not just what they wrote. */}
              <ItemMenuItem
                icon={UserRoundXIcon}
                disabled={readOnly}
                onSelect={() =>
                  actions.report({
                    kind: 'user',
                    id: author.id,
                    name: author.name,
                  })
                }
              >
                Report {author.name}
              </ItemMenuItem>
            </>
          )}
          {canDelete && (
            <>
              <ItemMenuSeparator />
              <ItemMenuItem
                icon={Trash2Icon}
                variant='destructive'
                disabled={readOnly}
                onSelect={() => actions.remove(comment, own)}
              >
                Delete
              </ItemMenuItem>
            </>
          )}
        </>
      }
    >
      {/* Its id is what links to it use, e.g. from the dashboard. */}
      <article
        id={`comment-${comment.id}`}
        className={cn('flex gap-3', linked && 'comment-linked')}
        aria-label={`Comment by ${author.name}`}
      >
        <div className='flex shrink-0 flex-col items-center gap-1'>
          {account ? (
            <Link
              href={account}
              aria-label={`${author.name}’s account`}
              className='flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm text-primary ring-1 ring-primary/20 transition-shadow outline-none hover:ring-2 hover:ring-primary/50 focus-visible:ring-2 focus-visible:ring-ring'
            >
              <UserAvatar user={author} />
            </Link>
          ) : (
            <span className='flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm text-primary ring-1 ring-primary/20'>
              <UserAvatar user={author} />
            </span>
          )}
          {hasReplies && <span className='comment-line flex-1' />}
        </div>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <div className='flex flex-wrap items-center gap-x-2 gap-y-0.5'>
            {account ? (
              <Link
                href={account}
                className='font-heading font-semibold hover:underline'
              >
                {author.name}
              </Link>
            ) : (
              <span className='font-heading font-semibold'>{author.name}</span>
            )}
            {author.role !== Role.USER && (
              <Badge variant='secondary'>{roleLabels[author.role]}</Badge>
            )}
            <LocalTime
              iso={comment.createdAt}
              className='text-xs text-muted-foreground'
            />
            {comment.editedAt && (
              <span className='text-xs text-muted-foreground'>(edited)</span>
            )}
            {/* Only its author and editors or admins still see it. */}
            {comment.hidden &&
              (viewer?.canModerate ? (
                <Badge variant='destructive' asChild>
                  <Link href='/dashboard/reports'>
                    <EyeOffIcon />
                    Hidden after reports
                  </Link>
                </Badge>
              ) : (
                <Badge variant='destructive'>
                  <EyeOffIcon />
                  Hidden from others while it’s reviewed
                </Badge>
              ))}
          </div>
          {isEditing ? (
            <CommentForm
              label='Edit your comment'
              submit='Save'
              initial={comment.body}
              autoFocus
              onCancel={() => actions.setEditing(null)}
              onSubmit={async (body) => {
                const result = await editComment(comment.id, { body });
                if (!result.ok) return result.error;
                actions.edited(result.comment);
                actions.setEditing(null);
              }}
            />
          ) : (
            <p className='text-sm/relaxed wrap-break-word whitespace-pre-line'>
              {comment.body}
            </p>
          )}
          {!isEditing && (
            <div className='-ml-2 flex flex-wrap items-center gap-1'>
              {canWrite && (
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={readOnly}
                  title={off}
                  onClick={() => actions.setReplyingTo(comment.id)}
                >
                  <ReplyIcon />
                  Reply
                </Button>
              )}
              {own && canWrite && (
                <Button
                  variant='ghost'
                  size='sm'
                  disabled={readOnly}
                  title={off}
                  onClick={() => actions.setEditing(comment.id)}
                >
                  <PencilIcon />
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-destructive hover:text-destructive'
                  disabled={readOnly}
                  title={off}
                  onClick={() => actions.remove(comment, own)}
                >
                  <Trash2Icon />
                  Delete
                </Button>
              )}
              {/* The same menu as right-click, e.g. for phones, and the
                  only way to report. */}
              <ItemMenuButton
                size='icon-sm'
                className='text-muted-foreground'
              />
            </div>
          )}
        </div>
      </article>
    </ItemMenu>
  );
}

/** The new comment form, or why they can't write one. */
function Composer({
  viewer,
  slug,
  children,
}: {
  viewer: CommentViewer;
  slug: string;
  children: React.ReactNode;
}) {
  switch (viewer.blocked) {
    case null:
      return children;
    case 'signed-out':
      return (
        <Notice>
          <Link
            href={`/sign-in?next=${encodeURIComponent(`/plushies/${slug}`)}`}
            className='font-medium text-primary hover:underline'
          >
            Sign in
          </Link>{' '}
          to leave a comment.
        </Notice>
      );
    case 'unverified':
      return (
        <Notice>
          <Link
            href='/account'
            className='font-medium text-primary hover:underline'
          >
            Verify your email address
          </Link>{' '}
          to leave a comment.
        </Notice>
      );
  }
}

/**
 * A text box for writing or editing a comment. `onSubmit` returns an error
 * to show, or nothing once it worked.
 */
function CommentForm({
  label,
  submit,
  initial = '',
  autoFocus,
  disabled,
  onSubmit,
  onCancel,
}: {
  label: string;
  submit: string;
  initial?: string;
  autoFocus?: boolean;
  /** Shown as it would be, but turned off, e.g. while viewing as someone. */
  disabled?: boolean;
  onSubmit: (body: string) => Promise<string | void>;
  onCancel?: () => void;
}) {
  const id = useId();
  const [body, setBody] = useState(initial);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function send() {
    const problem = commentError(body.trim());
    if (problem) return setError(problem);
    setError(undefined);
    startTransition(async () => {
      try {
        const failed = await onSubmit(body.trim());
        if (failed) return setError(failed);
        setBody('');
      } catch {
        setError('Something went wrong, try again');
      }
    });
  }

  return (
    <form
      className='flex flex-col gap-2'
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <label htmlFor={id} className='sr-only'>
        {label}
      </label>
      <Textarea
        id={id}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          // Ctrl/Cmd+Enter sends, like in most chats.
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            send();
          }
        }}
        maxLength={COMMENT_MAX}
        placeholder={disabled ? VIEWING_AS_MESSAGE : label}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={!!error || undefined}
        className='min-h-20'
      />
      {/* At the top, so the count sits right under the box, not centered
          next to the taller buttons. */}
      <div className='flex flex-wrap items-start justify-between gap-2'>
        <p
          className={cn(
            'text-xs',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
          aria-live='polite'
        >
          {error ?? `${body.length}/${COMMENT_MAX}`}
        </p>
        <div className='flex gap-2'>
          {onCancel && (
            <Button type='button' variant='ghost' onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type='submit' disabled={disabled || pending || !body.trim()}>
            {pending && <Loader2Icon className='animate-spin' />}
            {submit}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Comments while they load, shaped like the real ones. */
function CommentsSkeleton() {
  return (
    <div aria-busy>
      <span className='sr-only' role='status'>
        Loading comments…
      </span>
      <ul className='flex flex-col gap-6' aria-hidden>
        {['w-full max-w-md', 'w-2/3', 'w-5/6 max-w-sm'].map((line) => (
          <li key={line} className='flex gap-3'>
            <Skeleton className='size-8 shrink-0 rounded-full' />
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              <div className='flex items-center gap-2'>
                <Skeleton className='h-5 w-24' />
                <Skeleton className='h-3 w-16' />
              </div>
              <Skeleton className={cn('h-4', line)} />
              <Skeleton className='h-4 w-1/3' />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className='flex items-center gap-2 rounded-xl p-4 text-sm text-muted-foreground ring-1 ring-foreground/10'>
      {children}
    </p>
  );
}
