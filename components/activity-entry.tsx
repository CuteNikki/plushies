import {
  ArrowRight,
  ImageOff,
  KeyRound,
  Link2,
  LogOut,
  type LucideIcon,
  Mail,
  Pencil,
  Plus,
  Trash2,
  Unlink,
  UserPlus,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type {
  MethodSnapshot,
  PlushieSnapshot,
  UserSnapshot,
} from '@/lib/activity';
import {
  type Activity,
  ActivitySubject,
  ActivityType,
} from '@/lib/generated/prisma/client';
import { isRole, roleLabels } from '@/lib/permissions';
import { cn } from '@/lib/utils';

import { LocalTime } from '@/components/local-time';
import { PrivateText } from '@/components/private-text';
import { Badge } from '@/components/ui/badge';

/** What the page knows about plushies as they are now. */
export type ActivityContext = {
  /** Current slug by plushie id, for plushies that still exist. */
  slugs: Map<string, string>;
  /** Photo URLs still in use. The others were deleted from UploadThing. */
  photos: Set<string>;
};

const icons: Record<ActivityType, LucideIcon> = {
  CREATED: Plus,
  UPDATED: Pencil,
  DELETED: Trash2,
  PASSWORD_CHANGED: KeyRound,
  LINKED: Link2,
  UNLINKED: Unlink,
  SIGNED_OUT: LogOut,
  PASSWORD_RESET_SENT: Mail,
};

const methodLabels: Record<string, string> = {
  credential: 'a password',
  discord: 'Discord',
};

export function ActivityEntry({
  entry,
  context,
}: {
  entry: Activity;
  context: ActivityContext;
}) {
  const Icon =
    entry.subject === ActivitySubject.USER &&
    entry.type === ActivityType.CREATED
      ? UserPlus
      : icons[entry.type];
  const changes =
    entry.subject === ActivitySubject.PLUSHIE
      ? plushieChanges(entry, context)
      : userChanges(entry);

  return (
    <div className='flex flex-col gap-3 p-4'>
      <div className='flex items-start gap-3'>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md',
            entry.type === ActivityType.DELETED
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/15 text-primary'
          )}
        >
          <Icon className='size-4' aria-hidden />
        </span>
        <div className='flex min-w-0 flex-col'>
          <p className='text-sm text-pretty'>{sentence(entry, context)}</p>
          <LocalTime
            iso={entry.createdAt.toISOString()}
            className='text-xs text-muted-foreground'
          />
        </div>
      </div>
      {changes.length > 0 && (
        <dl className='flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-sm sm:ml-11'>
          {changes.map((change) => (
            <div
              key={change.label}
              className='grid gap-0.5 sm:grid-cols-[7rem_1fr] sm:gap-3'
            >
              <dt className='text-muted-foreground'>{change.label}</dt>
              <dd className='min-w-0'>{change.content}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function sentence(entry: Activity, context: ActivityContext) {
  const actor = <strong>{entry.actorName ?? 'Someone'}</strong>;
  const self = entry.actorId === entry.subjectId;

  if (entry.subject === ActivitySubject.PLUSHIE) {
    const slug = context.slugs.get(entry.subjectId);
    const plushie = slug ? (
      <Link
        href={`/plushies/${slug}`}
        className='font-semibold underline-offset-4 hover:underline'
      >
        {entry.subjectName}
      </Link>
    ) : (
      <strong>{entry.subjectName}</strong>
    );
    const verb = { CREATED: 'added', DELETED: 'deleted' }[
      entry.type as 'CREATED' | 'DELETED'
    ];
    return (
      <>
        {actor} {verb ?? 'edited'} {plushie}
      </>
    );
  }

  const subject = <strong>{entry.subjectName}</strong>;
  // "their account" when people change their own, "Mochi's account" otherwise.
  const whose = self ? 'their' : <>{subject}&rsquo;s</>;
  const method = (snapshot: unknown) =>
    methodLabels[(snapshot as MethodSnapshot | null)?.method ?? ''] ??
    'a sign-in method';

  switch (entry.type) {
    case ActivityType.CREATED:
      return <>{subject} signed up</>;
    case ActivityType.UPDATED:
      return (
        <>
          {actor} changed {whose} account
        </>
      );
    case ActivityType.DELETED:
      return (
        <>
          {actor} deleted {whose} account
        </>
      );
    case ActivityType.PASSWORD_CHANGED:
      return (
        <>
          {actor} changed {whose} password
        </>
      );
    case ActivityType.LINKED:
      return (
        <>
          {actor} added {method(entry.after)} to {whose} account
        </>
      );
    case ActivityType.UNLINKED:
      return (
        <>
          {actor} removed {method(entry.before)} from {whose} account
        </>
      );
    case ActivityType.SIGNED_OUT:
      return (
        <>
          {actor} signed {subject} out everywhere
        </>
      );
    case ActivityType.PASSWORD_RESET_SENT:
      return (
        <>
          {actor} sent {subject} a password reset link
        </>
      );
  }
}

type Change = { label: string; content: React.ReactNode };

/**
 * The fields that changed. New entries list what they were created with,
 * deleted ones what they had.
 */
function changedKeys<T extends object>(entry: Activity) {
  const before = entry.before as T | null;
  const after = entry.after as T | null;
  const keys = Object.keys(after ?? before ?? {}) as (keyof T)[];
  return {
    before,
    after,
    keys: keys.filter((key) => {
      if (before && after) {
        return JSON.stringify(before[key]) !== JSON.stringify(after[key]);
      }
      return !isEmpty((after ?? before)![key]);
    }),
  };
}

function isEmpty(value: unknown) {
  return (
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

const plushieLabels: Record<keyof PlushieSnapshot, string> = {
  name: 'Name',
  slug: 'URL name',
  thumbnail: 'Thumbnail',
  gallery: 'Gallery',
  species: 'Species',
  birthday: 'Birthday',
  gender: 'Gender',
  pronouns: 'Pronouns',
  origin: 'From',
  traits: 'Traits',
  description: 'Description',
  facts: 'Facts',
};

function plushieChanges(entry: Activity, context: ActivityContext): Change[] {
  const { before, after, keys } = changedKeys<PlushieSnapshot>(entry);
  // In the form's order: the database doesn't keep the snapshot's key order.
  const order = Object.keys(plushieLabels) as (keyof PlushieSnapshot)[];

  return order
    .filter((key) => keys.includes(key))
    .map((key) => {
      const old = before?.[key];
      const now = after?.[key];
      let content: React.ReactNode;
      switch (key) {
        case 'thumbnail':
          content = (
            <Compare
              old={old ? <Photo url={old as string} context={context} /> : null}
              now={now ? <Photo url={now as string} context={context} /> : null}
              hasOld={!!before}
              hasNow={!!after}
            />
          );
          break;
        case 'gallery':
          content = (
            <ListChange
              old={(old ?? []) as string[]}
              now={(now ?? []) as string[]}
              render={(url) => <Photo url={url} context={context} />}
              reordered='Reordered'
              grouped
              edited={!!before && !!after}
            />
          );
          break;
        case 'traits':
          content = (
            <ListChange
              old={(old ?? []) as string[]}
              now={(now ?? []) as string[]}
              render={(trait, removed) => (
                <Badge
                  variant='secondary'
                  className={cn(removed && 'line-through opacity-60')}
                >
                  {trait}
                </Badge>
              )}
              reordered='Reordered'
              edited={!!before && !!after}
            />
          );
          break;
        case 'facts':
          content = (
            <ListChange
              old={((old ?? []) as PlushieSnapshot['facts']).map(factText)}
              now={((now ?? []) as PlushieSnapshot['facts']).map(factText)}
              render={(fact, removed) => (
                <span
                  className={cn(
                    removed && 'text-muted-foreground line-through'
                  )}
                >
                  {fact}
                </span>
              )}
              reordered='Reordered'
              edited={!!before && !!after}
              column
            />
          );
          break;
        default:
          content = (
            <TextCompare
              old={old as string | null | undefined}
              now={now as string | null | undefined}
              hasOld={!!before}
              hasNow={!!after}
            />
          );
      }
      return { label: plushieLabels[key], content };
    });
}

function factText(fact: { label: string; value: string }) {
  return `${fact.label}: ${fact.value}`;
}

const userLabels: Record<keyof UserSnapshot, string> = {
  name: 'Name',
  email: 'Email',
  emailVerified: 'Email confirmed',
  role: 'Role',
};

function userChanges(entry: Activity): Change[] {
  if (
    entry.type !== ActivityType.CREATED &&
    entry.type !== ActivityType.UPDATED &&
    entry.type !== ActivityType.DELETED
  ) {
    return [];
  }
  const { before, after, keys } = changedKeys<UserSnapshot>(entry);
  const show = (key: keyof UserSnapshot, value: unknown) => {
    if (value === undefined) return undefined;
    if (key === 'emailVerified') return value ? 'Yes' : 'No';
    if (key === 'role')
      return isRole(value) ? roleLabels[value] : String(value);
    return String(value);
  };

  // In a fixed order: the database doesn't keep the snapshot's key order.
  const order = Object.keys(userLabels) as (keyof UserSnapshot)[];
  return order
    .filter((key) => keys.includes(key))
    .map((key) => ({
      label: userLabels[key],
      content:
        key === 'email' ? (
          <Compare
            old={
              before && (
                <PrivateText className='line-through'>
                  {before.email}
                </PrivateText>
              )
            }
            now={after && <PrivateText>{after.email}</PrivateText>}
            hasOld={!!before}
            hasNow={!!after}
          />
        ) : (
          <TextCompare
            old={show(key, before?.[key])}
            now={show(key, after?.[key])}
            hasOld={!!before}
            hasNow={!!after}
          />
        ),
    }));
}

/** Old → new. Created entries only have a new value, deleted ones an old. */
function Compare({
  old,
  now,
  hasOld,
  hasNow,
}: {
  old: React.ReactNode;
  now: React.ReactNode;
  hasOld: boolean;
  hasNow: boolean;
}) {
  return (
    <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
      {hasOld && (old ?? <Empty />)}
      {hasOld && hasNow && (
        <ArrowRight
          className='size-3.5 shrink-0 text-muted-foreground'
          aria-label='changed to'
        />
      )}
      {hasNow && (now ?? <Empty />)}
    </div>
  );
}

function TextCompare({
  old,
  now,
  hasOld,
  hasNow,
}: {
  old: string | null | undefined;
  now: string | null | undefined;
  hasOld: boolean;
  hasNow: boolean;
}) {
  const oldText = old && (
    <span
      className={cn(
        'wrap-break-word whitespace-pre-line',
        hasNow && 'text-muted-foreground line-through'
      )}
    >
      {old}
    </span>
  );
  const newText = now && (
    <span className='wrap-break-word whitespace-pre-line'>{now}</span>
  );

  // Long texts like descriptions read better one above the other.
  if ((old?.length ?? 0) + (now?.length ?? 0) > 80) {
    return (
      <div className='flex flex-col gap-1'>
        {hasOld && (oldText || <Empty />)}
        {hasNow && (newText || <Empty />)}
      </div>
    );
  }
  return (
    <Compare old={oldText} now={newText} hasOld={hasOld} hasNow={hasNow} />
  );
}

/**
 * A list that changed: what was added, what was removed, and whether the
 * order changed.
 */
function ListChange({
  old,
  now,
  render,
  reordered,
  column,
  grouped,
  edited,
}: {
  old: string[];
  now: string[];
  render: (item: string, removed: boolean) => React.ReactNode;
  reordered: string;
  column?: boolean;
  /** Label the added and removed items, for ones that can't be crossed out. */
  grouped?: boolean;
  /** False for created and deleted entries, which list what they had. */
  edited: boolean;
}) {
  const removed = old.filter((item) => !now.includes(item));
  const added = now.filter((item) => !old.includes(item));
  const sameItems = removed.length === 0 && added.length === 0;
  const list = (items: string[], isRemoved: (item: string) => boolean) => (
    <div className={cn('flex flex-wrap gap-1.5', column && 'flex-col')}>
      {items.map((item) => (
        <span key={item} className='contents'>
          {render(item, isRemoved(item) && edited)}
        </span>
      ))}
    </div>
  );

  if (sameItems) {
    return <span className='text-muted-foreground'>{reordered}</span>;
  }
  if (grouped && edited) {
    const groups = [
      { label: 'Added', items: added },
      { label: 'Removed', items: removed },
    ].filter((group) => group.items.length > 0);
    return (
      <div className='flex flex-col gap-2'>
        {groups.map((group) => (
          <div key={group.label} className='flex flex-col gap-1'>
            <span className='text-xs text-muted-foreground'>{group.label}</span>
            {list(group.items, () => group.label === 'Removed')}
          </div>
        ))}
      </div>
    );
  }
  return list([...added, ...removed], (item) => removed.includes(item));
}

function Photo({ url, context }: { url: string; context: ActivityContext }) {
  if (!context.photos.has(url)) {
    return (
      <span
        className='flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground'
        title='This photo was deleted'
      >
        <ImageOff className='size-4' aria-label='Deleted photo' />
      </span>
    );
  }
  return (
    <span className='relative size-12 overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10'>
      <Image src={url} alt='' fill sizes='48px' className='object-cover' />
    </span>
  );
}

function Empty() {
  return <span className='text-muted-foreground italic'>empty</span>;
}
