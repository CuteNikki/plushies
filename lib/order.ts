/**
 * Your own order of the plushies. Groups and the plushies outside one share
 * one order; the plushies in a group have their own, and always stay
 * together.
 */

export type OrderGroup = { id: string; name: string; position: number };

export type OrderItem<P> =
  | { kind: 'group'; group: OrderGroup; plushies: P[] }
  | { kind: 'plushie'; plushie: P };

/**
 * The groups and the plushies outside one, in order, with each group's
 * plushies in theirs. Ties keep the order `plushies` came in.
 */
export function arrange<
  P extends { position: number; group: OrderGroup | null },
>(plushies: P[]): OrderItem<P>[] {
  const groups = new Map<string, { group: OrderGroup; plushies: P[] }>();
  const items: { position: number; item: OrderItem<P> }[] = [];
  for (const plushie of plushies) {
    if (!plushie.group) {
      items.push({
        position: plushie.position,
        item: { kind: 'plushie', plushie },
      });
      continue;
    }
    let entry = groups.get(plushie.group.id);
    if (!entry) {
      entry = { group: plushie.group, plushies: [] };
      groups.set(plushie.group.id, entry);
      items.push({
        position: plushie.group.position,
        item: { kind: 'group', ...entry },
      });
    }
    entry.plushies.push(plushie);
  }
  for (const entry of groups.values()) {
    entry.plushies.sort((a, b) => a.position - b.position);
  }
  return items.sort((a, b) => a.position - b.position).map(({ item }) => item);
}

/** All the plushies in order, each group's together. */
export function inOrder<
  P extends { position: number; group: OrderGroup | null },
>(plushies: P[]): P[] {
  return arrange(plushies).flatMap((item) =>
    item.kind === 'group' ? item.plushies : [item.plushie]
  );
}
