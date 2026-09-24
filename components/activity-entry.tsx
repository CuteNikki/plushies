import Image from 'next/image';
import Link from 'next/link';

import {
  BanIcon,
  EyeIcon,
  ImageOffIcon,
  KeyRoundIcon,
  Link2Icon,
  LogOutIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
  Trash2Icon,
  Undo2Icon,
  UnlinkIcon,
  UserPlusIcon,
  type LucideIcon,
} from 'lucide-react';

import type { ActivityContext } from '@/data/activity';
import {
  same,
  type BanSnapshot,
  type MethodSnapshot,
  type PlushieSnapshot,
  type UserSnapshot,
} from '@/lib/activity';
import {
  ActivitySubject,
  ActivityType,
  type Activity,
} from '@/lib/generated/prisma/client';
import { isRole, roleLabels } from '@/lib/permissions';
import type { RevertOption } from '@/lib/revert';
import { cn } from '@/lib/utils';

import { LocalTime } from '@/components/local-time';
import { PrivateText } from '@/components/private-text';
import { RevertButton } from '@/components/revert-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const icons: Record<ActivityType, LucideIcon> = {
  CREATED: PlusIcon,
  UPDATED: PencilIcon,
  DELETED: Trash2Icon,
  PASSWORD_CHANGED: KeyRoundIcon,
  LINKED: Link2Icon,
  UNLINKED: UnlinkIcon,
  SIGNED_OUT: LogOutIcon,
  PASSWORD_RESET_SENT: MailIcon,
  IMPERSONATED: EyeIcon,
  BANNED: BanIcon,
  UNBANNED: ShieldCheckIcon,
};

const methodLabels: Record<string, string> = {
  credential: 'a password',
  discord: 'Discord',
};

export function ActivityEntry({
  entry,
  context,
  revert,
  revertedBy,
}: {
  entry: Activity;
  context: ActivityContext;
  /** Set when the change can be undone now. */
  revert: RevertOption | null;
  /** Who undid this change, if someone did. */
  revertedBy: string | null;
}) {
  const Icon =
    entry.subject === ActivitySubject.USER &&
    entry.type === ActivityType.CREATED
      ? UserPlusIcon
      : icons[entry.type];
  const changes =
    entry.subject === ActivitySubject.PLUSHIE
      ? plushieChanges(entry, context)
      : entry.type === ActivityType.BANNED ||
          entry.type === ActivityType.UNBANNED
        ? banChanges(entry)
        : userChanges(entry);
  // Edits compare before and after; new and deleted entries show one value.
  const edited = !!entry.before && !!entry.after;

  return (
    <div className='flex flex-col gap-3 p-4'>
      <div className='flex flex-wrap items-start gap-x-3 gap-y-2'>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-md',
            entry.type === ActivityType.DELETED ||
              entry.type === ActivityType.BANNED
              ? 'bg-destructive/10 text-destructive'
              : 'bg-primary/15 text-primary'
          )}
        >
          <Icon className='size-4' aria-hidden />
        </span>
        <div className='flex min-w-0 flex-1 flex-col'>
          <p className='text-sm text-pretty'>{sentence(entry, context)}</p>
          <LocalTime
            iso={entry.createdAt.toISOString()}
            className='text-xs text-muted-foreground'
          />
        </div>
        {(revertedBy || revert) && (
          // Below the text on phones, beside it on wider screens.
          <div className='ml-11 w-full sm:ml-0 sm:w-auto sm:shrink-0'>
            {revertedBy ? (
              <Button disabled variant='outline'>
                Reverted by {revertedBy}
                <Undo2Icon />
              </Button>
            ) : (
              revert && <RevertButton id={entry.id} {...revert} />
            )}
          </div>
        )}
      </div>
      {changes.length > 0 && (
        <dl
          className={cn(
            'grid gap-x-4 gap-y-2 rounded-lg bg-muted/40 p-3 text-sm sm:ml-11',
            edited
              ? 'grid-cols-2 sm:grid-cols-[7rem_1fr_1fr]'
              : 'sm:grid-cols-[7rem_1fr]'
          )}
        >
          {edited && (
            <div className='contents text-xs text-muted-foreground' aria-hidden>
              <span className='hidden sm:block' />
              <span>Before</span>
              <span>After</span>
            </div>
          )}
          {changes.map((change) => (
            <div key={change.label} className='contents'>
              <dt
                className={cn(
                  'text-muted-foreground',
                  // On phones the label gets its own line above the values,
                  // smaller so it doesn't read like the old value.
                  edited &&
                    'col-span-2 -mb-1 text-xs font-medium sm:col-span-1 sm:mb-0 sm:text-sm sm:font-normal'
                )}
              >
                {change.label}
              </dt>
              {edited ? (
                <>
                  <dd className='min-w-0'>
                    <span className='sr-only'>Before: </span>
                    {change.before}
                  </dd>
                  <dd className='min-w-0'>
                    <span className='sr-only'>After: </span>
                    {change.after}
                  </dd>
                </>
              ) : (
                <dd className='min-w-0'>{change.before ?? change.after}</dd>
              )}
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
        className='font-semibold hover:underline'
      >
        {entry.subjectName}
      </Link>
    ) : (
      <strong>{entry.subjectName}</strong>
    );
    if (entry.revertOf) {
      const what = {
        UPDATED: <>reverted a change to {plushie}</>,
        CREATED: <>restored {plushie}</>,
        DELETED: <>undid adding {plushie}</>,
      }[entry.type as 'UPDATED' | 'CREATED' | 'DELETED'];
      return (
        <>
          {actor} {what}
        </>
      );
    }
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
      return entry.revertOf ? (
        <>
          {actor} reverted {whose} role
        </>
      ) : (
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
    case ActivityType.IMPERSONATED:
      return (
        <>
          {actor} viewed the site as {subject}
        </>
      );
    case ActivityType.BANNED:
      return (
        <>
          {actor} banned {subject}
          {entry.revertOf && ' again'}
        </>
      );
    case ActivityType.UNBANNED:
      return entry.revertOf ? (
        <>
          {actor} undid {subject}&rsquo;s ban
        </>
      ) : (
        <>
          {actor} lifted {subject}&rsquo;s ban
        </>
      );
  }
}

/** The ban that was given or lifted: why, and when it ends. */
function banChanges(entry: Activity): Change[] {
  const ban = (entry.after ?? entry.before) as BanSnapshot | null;
  if (!ban) return [];
  return [
    {
      label: 'Reason',
      after: ban.reason ? (
        <Text value={ban.reason} />
      ) : (
        <span className='text-muted-foreground italic'>none given</span>
      ),
    },
    {
      label: 'Ends',
      after: ban.expires ? (
        <LocalTime iso={ban.expires} absolute />
      ) : (
        'When lifted'
      ),
    },
  ];
}

/** One changed field. New entries only have `after`, deleted ones `before`. */
type Change = {
  label: string;
  before?: React.ReactNode;
  after?: React.ReactNode;
};

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
      if (before && after) return !same(before[key], after[key]);
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
      const show = (
        snapshot: PlushieSnapshot | null,
        other: PlushieSnapshot | null,
        highlight: Highlight
      ): React.ReactNode => {
        if (!snapshot) return undefined;
        const value = snapshot[key];
        // Items only on this side are what was removed or added.
        const changed = (items: string[], otherItems: string[] | undefined) =>
          new Set(
            otherItems ? items.filter((item) => !otherItems.includes(item)) : []
          );
        switch (key) {
          case 'thumbnail':
            return value ? (
              <Photo url={value as string} context={context} />
            ) : (
              <Empty />
            );
          case 'gallery': {
            const urls = value as string[];
            return (
              <List
                items={urls}
                changed={changed(urls, other?.gallery)}
                render={(url, isChanged) => (
                  <Photo
                    url={url}
                    context={context}
                    highlight={isChanged ? highlight : undefined}
                  />
                )}
              />
            );
          }
          case 'traits': {
            const traits = value as string[];
            return (
              <List
                items={traits}
                changed={changed(traits, other?.traits)}
                render={(trait, isChanged) => (
                  <Badge
                    variant='secondary'
                    className={cn(isChanged && highlights[highlight])}
                  >
                    {trait}
                  </Badge>
                )}
              />
            );
          }
          case 'facts': {
            const facts = (value as PlushieSnapshot['facts']).map(factText);
            return (
              <List
                column
                items={facts}
                changed={changed(facts, other?.facts.map(factText))}
                render={(fact, isChanged) => (
                  <span
                    className={cn(
                      '-mx-1 w-fit rounded px-1',
                      isChanged && highlights[highlight]
                    )}
                  >
                    {fact}
                  </span>
                )}
              />
            );
          }
          default:
            return <Text value={value as string | null} />;
        }
      };
      return {
        label: plushieLabels[key],
        before: show(before, after, 'removed'),
        after: show(after, before, 'added'),
      };
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
  const show = (snapshot: UserSnapshot | null, key: keyof UserSnapshot) => {
    if (!snapshot) return undefined;
    const value = snapshot[key];
    switch (key) {
      case 'email':
        return <PrivateText>{snapshot.email}</PrivateText>;
      case 'emailVerified':
        return value ? 'Yes' : 'No';
      case 'role':
        return isRole(value) ? roleLabels[value] : String(value);
      default:
        return <Text value={String(value)} />;
    }
  };

  // In a fixed order: the database doesn't keep the snapshot's key order.
  const order = Object.keys(userLabels) as (keyof UserSnapshot)[];
  return order
    .filter((key) => keys.includes(key))
    .map((key) => ({
      label: userLabels[key],
      before: show(before, key),
      after: show(after, key),
    }));
}

/** Tints for list items that only one side has. */
type Highlight = 'removed' | 'added';

const highlights: Record<Highlight, string> = {
  removed: 'bg-destructive/15 text-destructive',
  added: 'bg-primary/20 text-primary',
};

function Text({ value }: { value: string | null }) {
  if (!value) return <Empty />;
  return <span className='wrap-break-word whitespace-pre-line'>{value}</span>;
}

/** A list, with the items in `changed` marked by `render`. */
function List({
  items,
  changed,
  render,
  column,
}: {
  items: string[];
  changed: Set<string>;
  render: (item: string, changed: boolean) => React.ReactNode;
  column?: boolean;
}) {
  if (items.length === 0) return <Empty />;
  return (
    <div className={cn('flex flex-wrap gap-1.5', column && 'flex-col gap-1')}>
      {items.map((item) => (
        <span key={item} className='contents'>
          {render(item, changed.has(item))}
        </span>
      ))}
    </div>
  );
}

function Photo({
  url,
  context,
  highlight,
}: {
  url: string;
  context: ActivityContext;
  highlight?: Highlight;
}) {
  const ring =
    highlight === 'removed'
      ? 'ring-2 ring-destructive'
      : highlight === 'added'
        ? 'ring-2 ring-primary'
        : 'ring-1 ring-foreground/10';
  if (!context.photos.has(url)) {
    return (
      <span
        className={cn(
          'flex size-12 items-center justify-center rounded-md bg-muted text-muted-foreground',
          highlight && ring
        )}
        title='This photo was deleted'
      >
        <ImageOffIcon className='size-4' aria-label='Deleted photo' />
      </span>
    );
  }
  return (
    <span
      className={cn(
        'relative block size-12 overflow-hidden rounded-md bg-muted',
        ring
      )}
    >
      <Image src={url} alt='' fill sizes='48px' className='object-cover' />
    </span>
  );
}

function Empty() {
  return <span className='text-muted-foreground italic'>empty</span>;
}
