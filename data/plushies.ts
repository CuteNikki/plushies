import 'server-only';

import { cache } from 'react';

import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';
import { inOrder, type OrderGroup } from '@/lib/order';

export type PlushieImage = { key: string; url: string };

export type PlushieFact = { label: string; value: string };

export type Plushie = {
  id: string;
  /** Used in the URL, e.g. /plushies/mochi. Lowercase, no spaces. */
  slug: string;
  name: string;
  /** The main photo, shown on the card and first on the plushie's page. */
  thumbnail: PlushieImage | null;
  /** Extra photos shown on the plushie's page. */
  gallery: PlushieImage[];
  /** What kind of plushie it is, e.g. 'Bunny', 'Shark', 'Frog'. */
  species: string | null;
  /** Birthday as YYYY, YYYY-MM or YYYY-MM-DD. The age is calculated from it. */
  birthday: string | null;
  gender: string | null;
  pronouns: string | null;
  description: string;
  /** Where they came from, e.g. 'IKEA', 'A claw machine in Tokyo'. */
  origin: string | null;
  /** Any extra facts you want to show, e.g. Favorite food: Strawberries. */
  facts: PlushieFact[];
  /** Little personality tags shown as badges. */
  traits: string[];
  /** How many accounts like them. */
  likes: number;
  /** The plushies they belong with, e.g. a family. */
  group: OrderGroup | null;
  /** Their place in your order, among their group or outside one. */
  position: number;
  /** When they were added, as an ISO string. */
  createdAt: string;
};

const include = {
  gallery: { orderBy: { position: 'asc' } },
  _count: { select: { likes: true } },
  group: { select: { id: true, name: true, position: true } },
} satisfies Prisma.PlushieInclude;

type PlushieRow = Prisma.PlushieGetPayload<{ include: typeof include }>;

function toPlushie(row: PlushieRow): Plushie {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    thumbnail:
      row.thumbnailKey && row.thumbnailUrl
        ? { key: row.thumbnailKey, url: row.thumbnailUrl }
        : null,
    gallery: row.gallery.map(({ key, url }) => ({ key, url })),
    species: row.species,
    birthday: row.birthday,
    gender: row.gender,
    pronouns: row.pronouns,
    description: row.description,
    origin: row.origin,
    facts: (row.facts ?? []) as PlushieFact[],
    traits: row.traits,
    likes: row._count.likes,
    group: row.group,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

// Wrapped in cache() so a page and its metadata share one query per request.

/** In your order, each group's plushies together. */
export const getPlushies = cache(async () => {
  const rows = await db.plushie.findMany({
    include,
    orderBy: { createdAt: 'asc' },
  });
  return inOrder(rows.map(toPlushie));
});

/** The groups' names, for picking one in the plushie form. */
export const getGroupNames = cache(async () => {
  const groups = await db.plushieGroup.findMany({
    select: { name: true },
    orderBy: { name: 'asc' },
  });
  return groups.map((group) => group.name);
});

/** Everyone who can be mentioned with @, for the plushie form. */
export const getMentionOptions = cache(async () => {
  const plushies = await getPlushies();
  return plushies.map(({ id, name, slug, thumbnail }) => ({
    id,
    name,
    slug,
    thumbnail,
  }));
});

export const getPlushie = cache(async (slug: string) => {
  const row = await db.plushie.findUnique({ where: { slug }, include });
  return row ? toPlushie(row) : null;
});

export const getPlushieById = cache(async (id: string) => {
  const row = await db.plushie.findUnique({ where: { id }, include });
  return row ? toPlushie(row) : null;
});
