'use client';

import {
  closestCenter,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useId,
  useRef,
  useState,
  useTransition,
} from 'react';
import { toast } from 'sonner';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  FolderInputIcon,
  FolderOutputIcon,
  FolderPlusIcon,
  GripVerticalIcon,
  Loader2Icon,
} from 'lucide-react';

import { moveToNewGroup, renameGroup, saveOrder } from '@/actions/plushies';
import type { Plushie } from '@/data/plushies';
import { cn } from '@/lib/utils';

import { PlushiePhoto } from '@/components/plushie-photo';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

export type ArrangePlushie = Pick<Plushie, 'id' | 'name' | 'thumbnail'>;

export type ArrangeItem =
  | {
      kind: 'group';
      group: { id: string; name: string };
      plushies: ArrangePlushie[];
    }
  | { kind: 'plushie'; plushie: ArrangePlushie };

/**
 * Where everything is, by key: 'g:<id>' for a group and 'p:<id>' for a
 * plushie. `order` is the groups and the plushies outside one; `members`
 * holds each group's plushies.
 */
type Layout = { order: string[]; members: Record<string, string[]> };

/** The list outside any group, as a place to drop. */
const ROOT = 'root';
/** Inside a group, as a place to drop, e.g. when it's empty. */
const inside = (groupId: string) => `in:${groupId}`;
const idOf = (key: string) => key.slice(2);

/** The group a key is in, or ROOT, or null if it's nowhere. */
function containerOf(layout: Layout, key: string) {
  if (layout.order.includes(key)) return ROOT;
  for (const [groupId, keys] of Object.entries(layout.members)) {
    if (keys.includes(key)) return groupId;
  }
  return null;
}

function listOf(layout: Layout, container: string) {
  return container === ROOT ? layout.order : layout.members[container];
}

function withList(layout: Layout, container: string, list: string[]): Layout {
  return container === ROOT
    ? { ...layout, order: list }
    : { ...layout, members: { ...layout.members, [container]: list } };
}

/** `key` taken out of `from` and put into `to` at `index`. */
function moveBetween(
  layout: Layout,
  key: string,
  from: string,
  to: string,
  index: number
) {
  const removed = withList(
    layout,
    from,
    listOf(layout, from).filter((other) => other !== key)
  );
  const target = [...listOf(removed, to)];
  target.splice(index, 0, key);
  return withList(removed, to, target);
}

function toInput(layout: Layout) {
  return layout.order.map((key) =>
    key.startsWith('g:')
      ? {
          kind: 'group' as const,
          id: idOf(key),
          plushieIds: layout.members[idOf(key)].map(idOf),
        }
      : { kind: 'plushie' as const, id: idOf(key) }
  );
}

/**
 * Your order of the plushies. Drag by the handle, or use the arrows; a
 * plushie can be dragged into a group or out of one, or moved with its
 * menu. Groups move as a whole. Every change saves right away.
 */
export function ArrangeList({ initial }: { initial: ArrangeItem[] }) {
  const router = useRouter();
  const dndId = useId();
  const [plushies] = useState(
    () =>
      new Map(
        initial.flatMap((item) =>
          item.kind === 'group'
            ? item.plushies.map((plushie) => [plushie.id, plushie] as const)
            : [[item.plushie.id, item.plushie] as const]
        )
      )
  );
  const [groupNames, setGroupNames] = useState(
    () =>
      new Map(
        initial.flatMap((item) =>
          item.kind === 'group' ? [[item.group.id, item.group.name]] : []
        )
      )
  );
  const [layout, setLayout] = useState<Layout>(() => ({
    order: initial.map((item) =>
      item.kind === 'group' ? `g:${item.group.id}` : `p:${item.plushie.id}`
    ),
    members: Object.fromEntries(
      initial.flatMap((item) =>
        item.kind === 'group'
          ? [[item.group.id, item.plushies.map((p) => `p:${p.id}`)]]
          : []
      )
    ),
  }));
  // The newest layout, for handlers that run before a re-render.
  const latest = useRef(layout);
  // How things were when a drag started, to undo a cancelled one.
  const before = useRef<Layout | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [newGroupFor, setNewGroupFor] = useState<ArrangePlushie | null>(null);
  const [saving, startSaving] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor));

  function update(next: Layout) {
    latest.current = next;
    setLayout(next);
  }

  function save(next: Layout) {
    update(next);
    startSaving(async () => {
      try {
        const result = await saveOrder(toInput(next));
        if (result.error) throw new Error(result.error);
      } catch {
        toast.error('The order couldn’t be saved, try again');
      }
      // Picks up groups that are gone now, or were changed elsewhere.
      router.refresh();
    });
  }

  // Groups move among the groups and plushies outside one. Plushies go
  // where the pointer is: onto another plushie, into a group, onto a
  // group's header (next to it, outside), or the space below everything.
  const collisions: CollisionDetection = (args) => {
    const active = String(args.active.id);
    if (active.startsWith('g:')) {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((container) =>
          latest.current.order.includes(String(container.id))
        ),
      });
    }
    const hits = pointerWithin(args).filter((hit) => hit.id !== active);
    const first = (prefix: string) =>
      hits.find((hit) => String(hit.id).startsWith(prefix));
    const hit = first('p:') ?? first('in:') ?? first('g:') ?? first(ROOT);
    if (hit) return [hit];
    return closestCenter({
      ...args,
      droppableContainers: args.droppableContainers.filter((container) =>
        String(container.id).startsWith('p:')
      ),
    });
  };

  function onDragStart({ active }: DragStartEvent) {
    before.current = latest.current;
    setDragging(String(active.id));
  }

  // Into or out of a group while dragging, so the list makes room there.
  function onDragOver({ active, over }: DragOverEvent) {
    const key = String(active.id);
    if (!over || key.startsWith('g:')) return;
    const current = latest.current;
    const overId = String(over.id);
    const from = containerOf(current, key);
    const to =
      overId === ROOT
        ? ROOT
        : overId.startsWith('in:')
          ? overId.slice(3)
          : overId.startsWith('g:')
            ? ROOT
            : containerOf(current, overId);
    if (!from || !to || from === to) return;

    const list = listOf(current, to);
    let index = list.length;
    if (list.includes(overId)) {
      const dragged = active.rect.current.translated;
      const below =
        !!dragged && dragged.top > over.rect.top + over.rect.height / 2;
      index = list.indexOf(overId) + (below ? 1 : 0);
    }
    update(moveBetween(current, key, from, to, index));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setDragging(null);
    const key = String(active.id);
    let next = latest.current;
    const container = containerOf(next, key);
    const overId = over && String(over.id);
    if (container && overId && overId !== key) {
      const list = listOf(next, container);
      if (list.includes(overId)) {
        next = withList(
          next,
          container,
          arrayMove(list, list.indexOf(key), list.indexOf(overId))
        );
      }
    }
    if (JSON.stringify(next) !== JSON.stringify(before.current)) save(next);
  }

  function onDragCancel() {
    setDragging(null);
    if (before.current) update(before.current);
  }

  /** One place up or down, in the same list. */
  function step(key: string, by: number) {
    const current = latest.current;
    const container = containerOf(current, key);
    if (!container) return;
    const list = listOf(current, container);
    const index = list.indexOf(key);
    save(withList(current, container, arrayMove(list, index, index + by)));
  }

  /** Last in `groupId`, or right after their group for ROOT. */
  function moveTo(key: string, groupId: string) {
    const current = latest.current;
    const from = containerOf(current, key);
    if (!from || from === groupId) return;
    const index =
      groupId === ROOT
        ? current.order.indexOf(`g:${from}`) + 1
        : current.members[groupId].length;
    save(moveBetween(current, key, from, groupId, index));
  }

  return (
    <ArrangeContext
      value={{
        layout,
        plushies,
        groupNames,
        step,
        moveTo,
        newGroup: setNewGroupFor,
      }}
    >
      <div className='flex flex-col gap-3'>
        <p
          className='flex h-5 items-center gap-1.5 text-sm text-muted-foreground'
          aria-live='polite'
        >
          {saving && (
            <>
              <Loader2Icon className='size-3.5 animate-spin' />
              Saving…
            </>
          )}
        </p>
        <DndContext
          id={dndId}
          sensors={sensors}
          collisionDetection={collisions}
          measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <RootList>
            <SortableContext
              items={layout.order}
              strategy={verticalListSortingStrategy}
            >
              {layout.order.map((key, index) =>
                key.startsWith('g:') ? (
                  <GroupCard
                    key={key}
                    sortId={key}
                    groupId={idOf(key)}
                    name={groupNames.get(idOf(key)) ?? ''}
                    onRenamed={(name) =>
                      setGroupNames((names) =>
                        new Map(names).set(idOf(key), name)
                      )
                    }
                    first={index === 0}
                    last={index === layout.order.length - 1}
                    onStep={(by) => step(key, by)}
                  >
                    <SortableContext
                      items={layout.members[idOf(key)]}
                      strategy={verticalListSortingStrategy}
                    >
                      {layout.members[idOf(key)].map((member) => (
                        <PlushieItem key={member} sortId={member} />
                      ))}
                    </SortableContext>
                  </GroupCard>
                ) : (
                  <PlushieItem key={key} sortId={key} />
                )
              )}
            </SortableContext>
          </RootList>
          <DragOverlay>
            {dragging &&
              (dragging.startsWith('g:') ? (
                <GroupPreview
                  name={groupNames.get(idOf(dragging)) ?? ''}
                  count={layout.members[idOf(dragging)]?.length ?? 0}
                />
              ) : (
                <PlushieItem sortId={dragging} overlay />
              ))}
          </DragOverlay>
        </DndContext>
        <NewGroupDialog
          plushie={newGroupFor}
          onClose={() => setNewGroupFor(null)}
          onMoved={() => {
            setNewGroupFor(null);
            router.refresh();
          }}
        />
      </div>
    </ArrangeContext>
  );
}

const ArrangeContext = createContext<{
  layout: Layout;
  plushies: ReadonlyMap<string, ArrangePlushie>;
  groupNames: ReadonlyMap<string, string>;
  step: (key: string, by: number) => void;
  moveTo: (key: string, groupId: string) => void;
  newGroup: (plushie: ArrangePlushie) => void;
} | null>(null);

/** A plushie where they are in the list, or following the pointer. */
function PlushieItem({
  sortId,
  overlay,
}: {
  sortId: string;
  overlay?: boolean;
}) {
  const { layout, plushies, groupNames, step, moveTo, newGroup } =
    useContext(ArrangeContext)!;
  const plushie = plushies.get(idOf(sortId))!;
  const container = containerOf(layout, sortId) ?? ROOT;
  const list = listOf(layout, container) ?? [];
  const Row = overlay ? PlushieRow : SortablePlushieRow;
  return (
    <Row
      sortId={sortId}
      plushie={plushie}
      first={list[0] === sortId}
      last={list.at(-1) === sortId}
      onStep={(by) => step(sortId, by)}
      groupName={
        container === ROOT ? null : (groupNames.get(container) ?? null)
      }
      otherGroups={[...groupNames]
        .filter(([id]) => id !== container)
        .map(([id, name]) => ({ id, name }))}
      onMoveTo={(groupId) => moveTo(sortId, groupId)}
      onNewGroup={() => newGroup(plushie)}
    />
  );
}

/** The whole list, with room below it to drop things last. */
function RootList({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: ROOT });
  return (
    <ul ref={setNodeRef} className='flex flex-col gap-2 pb-12'>
      {children}
    </ul>
  );
}

function GroupCard({
  sortId,
  groupId,
  name,
  onRenamed,
  first,
  last,
  onStep,
  children,
}: {
  sortId: string;
  groupId: string;
  name: string;
  onRenamed: (name: string) => void;
  first: boolean;
  last: boolean;
  onStep: (by: number) => void;
  children: React.ReactNode;
}) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortId });
  const { setNodeRef: setInsideRef } = useDroppable({ id: inside(groupId) });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'flex flex-col gap-2 rounded-xl bg-muted/40 p-2 ring-1 ring-foreground/10',
        isDragging && 'opacity-40'
      )}
    >
      <div className='flex items-center gap-2 p-2'>
        <Handle
          label={name}
          activatorRef={setActivatorNodeRef}
          listeners={listeners}
        />
        <GroupName id={groupId} name={name} onRenamed={onRenamed} />
        <Arrows label={name} first={first} last={last} onStep={onStep} />
      </div>
      <ul ref={setInsideRef} className='flex min-h-14 flex-col gap-2'>
        {children}
      </ul>
    </li>
  );
}

/** A group as it looks while it's dragged. */
function GroupPreview({ name, count }: { name: string; count: number }) {
  return (
    <div className='flex items-center gap-2 rounded-xl bg-muted p-4 shadow-lg ring-1 ring-foreground/10'>
      <GripVerticalIcon className='size-4 text-muted-foreground' />
      <span className='font-heading text-base font-semibold'>{name}</span>
      <span className='text-sm text-muted-foreground'>
        {count === 1 ? '1 plushie' : `${count} plushies`}
      </span>
    </div>
  );
}

type PlushieRowProps = {
  sortId: string;
  plushie: ArrangePlushie;
  first: boolean;
  last: boolean;
  onStep: (by: number) => void;
  groupName: string | null;
  otherGroups: { id: string; name: string }[];
  onMoveTo: (groupId: string) => void;
  onNewGroup: () => void;
};

/** A plushie in the list, dragged by its handle. */
function SortablePlushieRow(props: PlushieRowProps) {
  const {
    setNodeRef,
    setActivatorNodeRef,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.sortId });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        'rounded-lg bg-background ring-1 ring-foreground/10',
        isDragging && 'opacity-40'
      )}
    >
      <PlushieRow
        {...props}
        handle={
          <Handle
            label={props.plushie.name}
            activatorRef={setActivatorNodeRef}
            listeners={listeners}
          />
        }
      />
    </li>
  );
}

/**
 * A plushie's row. Without a handle, it's the copy that follows the
 * pointer while dragging.
 */
function PlushieRow({
  plushie,
  handle,
  first,
  last,
  onStep,
  groupName,
  otherGroups,
  onMoveTo,
  onNewGroup,
}: PlushieRowProps & { handle?: React.ReactNode }) {
  const row = (
    <div className='flex items-center gap-2 p-2'>
      {handle ?? (
        <GripVerticalIcon className='size-4 shrink-0 text-muted-foreground' />
      )}
      <div className='flex min-w-0 flex-1 items-center gap-3'>
        <PlushiePhoto
          plushie={plushie}
          sizes='40px'
          compact
          className='size-10 shrink-0 rounded-lg'
        />
        <span className='truncate font-medium'>{plushie.name}</span>
      </div>
      <Arrows label={plushie.name} first={first} last={last} onStep={onStep} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={`Move ${plushie.name} to a group`}
          >
            <FolderInputIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          {otherGroups.length > 0 && (
            <>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {otherGroups.map((group) => (
                <DropdownMenuItem
                  key={group.id}
                  onSelect={() => onMoveTo(group.id)}
                >
                  <FolderInputIcon />
                  {group.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          )}
          {groupName && (
            <DropdownMenuItem onSelect={() => onMoveTo(ROOT)}>
              <FolderOutputIcon />
              Out of {groupName}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={onNewGroup}>
            <FolderPlusIcon />
            New group…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
  if (handle) return row;
  return (
    <div className='rounded-lg bg-background shadow-lg ring-1 ring-foreground/10'>
      {row}
    </div>
  );
}

/** What's dragged: the grip, not the whole row, so the page still scrolls. */
function Handle({
  label,
  activatorRef,
  listeners,
}: {
  label: string;
  activatorRef: (element: HTMLElement | null) => void;
  listeners: ReturnType<typeof useSortable>['listeners'];
}) {
  return (
    <button
      type='button'
      ref={activatorRef}
      aria-label={`Drag ${label}`}
      // Only the arrows and menu are for keyboards.
      tabIndex={-1}
      {...listeners}
      className='-m-1 cursor-grab touch-none rounded-md p-1 text-muted-foreground hover:text-foreground active:cursor-grabbing'
    >
      <GripVerticalIcon className='size-4' />
    </button>
  );
}

function Arrows({
  label,
  first,
  last,
  onStep,
}: {
  label: string;
  first: boolean;
  last: boolean;
  onStep: (by: number) => void;
}) {
  return (
    <div className='flex shrink-0 gap-1'>
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        aria-label={`Move ${label} up`}
        disabled={first}
        onClick={() => onStep(-1)}
      >
        <ArrowUpIcon />
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon-sm'
        aria-label={`Move ${label} down`}
        disabled={last}
        onClick={() => onStep(1)}
      >
        <ArrowDownIcon />
      </Button>
    </div>
  );
}

/** The group's name, renamed by typing a new one. */
function GroupName({
  id,
  name,
  onRenamed,
}: {
  id: string;
  name: string;
  onRenamed: (name: string) => void;
}) {
  const [value, setValue] = useState(name);
  const [pending, startTransition] = useTransition();

  function rename() {
    const next = value.trim();
    if (next === name) return;
    startTransition(async () => {
      try {
        const result = await renameGroup(id, next);
        if (result.error) {
          toast.error(result.error);
          setValue(name);
          return;
        }
        onRenamed(next);
        setValue(next);
        toast.success(`Renamed to ${next}`);
      } catch {
        toast.error('Something went wrong, try again');
        setValue(name);
      }
    });
  }

  return (
    <div className='flex min-w-0 flex-1 items-center gap-2'>
      <Input
        aria-label='Group name'
        value={value}
        disabled={pending}
        onChange={(event) => setValue(event.target.value)}
        onBlur={rename}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur();
          if (event.key === 'Escape') {
            // Blurred once the old name is back, so it isn't saved.
            const input = event.currentTarget;
            setValue(name);
            requestAnimationFrame(() => input.blur());
          }
        }}
        className='h-8 max-w-64 font-heading text-base font-semibold'
      />
      {pending && (
        <Loader2Icon className='size-3.5 animate-spin text-muted-foreground' />
      )}
    </div>
  );
}

/** Asks for a name, then moves the plushie into a group by that name. */
function NewGroupDialog({
  plushie,
  onClose,
  onMoved,
}: {
  plushie: ArrangePlushie | null;
  onClose: () => void;
  onMoved: () => void;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <Dialog
      open={!!plushie}
      onOpenChange={(open) => {
        if (open) return;
        onClose();
        setName('');
        setError(undefined);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>
            {plushie?.name} moves into it, and the group goes where they were. A
            name another group has moves them there instead.
          </DialogDescription>
        </DialogHeader>
        <form
          className='flex flex-col gap-4'
          onSubmit={(event) => {
            event.preventDefault();
            if (!plushie) return;
            startTransition(async () => {
              try {
                const result = await moveToNewGroup(plushie.id, name);
                if (result.error) return setError(result.error);
                setName('');
                setError(undefined);
                onMoved();
              } catch {
                setError('Something went wrong, try again');
              }
            });
          }}
        >
          <Input
            aria-label='Group name'
            placeholder='Peach & Goma'
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={!!error || undefined}
            autoFocus
          />
          {error && <p className='text-sm text-destructive'>{error}</p>}
          <DialogFooter>
            <Button type='submit' disabled={pending || !name.trim()}>
              {pending && <Loader2Icon className='animate-spin' />}
              Move
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
