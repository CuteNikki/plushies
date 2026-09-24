import 'server-only';

import { cache } from 'react';

import { db } from '@/lib/db';
import type { Prisma } from '@/lib/generated/prisma/client';

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
};

const include = {
  gallery: { orderBy: { position: 'asc' } },
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
  };
}

// Wrapped in cache() so a page and its metadata share one query per request.

export const getPlushies = cache(async () => {
  const rows = await db.plushie.findMany({
    include,
    orderBy: { createdAt: 'asc' },
  });
  return rows.map(toPlushie);
});

export const getPlushie = cache(async (slug: string) => {
  const row = await db.plushie.findUnique({ where: { slug }, include });
  return row ? toPlushie(row) : null;
});

export const getPlushieById = cache(async (id: string) => {
  const row = await db.plushie.findUnique({ where: { id }, include });
  return row ? toPlushie(row) : null;
});
