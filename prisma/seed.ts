import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../lib/generated/prisma/client';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// The plushies that used to live in lib/plushies.ts. Existing slugs are skipped.
const plushies = [
  {
    slug: 'mochi',
    name: 'Mochi',
    species: 'Bunny',
    birthday: '2021-04-02',
    gender: 'Girl',
    pronouns: 'she/her',
    description:
      'A very round bunny who insists on sleeping in the exact middle of the bed. Soft ears, softer heart.',
    origin: 'A tiny shop in a train station',
    facts: [
      { label: 'Favorite food', value: 'Strawberry daifuku' },
      { label: 'Favorite spot', value: 'The middle pillow' },
    ],
    traits: ['Sleepy', 'Gentle', 'Cuddly'],
  },
  {
    slug: 'blahaj',
    name: 'Blåhaj',
    species: 'Shark',
    birthday: '2019-11-15',
    gender: 'Non-binary',
    pronouns: 'they/them',
    description:
      'Fearsome predator of the deep, currently employed as a professional pillow. Has seen things.',
    origin: 'IKEA',
    facts: [
      { label: 'Favorite food', value: 'Swedish meatballs' },
      { label: 'Hidden talent', value: 'Emotional support' },
    ],
    traits: ['Brave', 'Loyal'],
  },
  {
    slug: 'pickle',
    name: 'Pickle',
    species: 'Frog',
    birthday: '2023-06-21',
    gender: 'Boy',
    pronouns: 'he/him',
    description:
      'Small, green and permanently surprised. Pickle thinks every day is the best day ever.',
    origin: 'Claw machine (third try)',
    facts: [],
    traits: ['Chaotic', 'Cheerful'],
  },
];

for (const plushie of plushies) {
  await db.plushie.upsert({
    where: { slug: plushie.slug },
    update: {},
    create: plushie,
  });
}

console.log(`Seeded ${plushies.length} plushies.`);
await db.$disconnect();
