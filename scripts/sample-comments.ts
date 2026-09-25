// Usage: bun run sample-comments            adds sample comments
//        bun run sample-comments --remove   takes them out again
// Written by the existing accounts on the existing plushies, straight to the
// database, so they aren't in the activity log. Recognised by their texts.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../lib/generated/prisma/client';

const topLevel = [
  'This one is my absolute favourite!',
  'Look at that little face, I can’t handle it.',
  'How soft is this one? It looks like a cloud.',
  'I need to know where you found them.',
  'The colours on this one are so pretty.',
  'This is the kind of plushie you hug after a long day.',
  'Okay but the tiny paws!!',
  'I think they deserve a little hat.',
  'They look like they give the best hugs.',
  'Such a calm and friendly face.',
  'I would take this one everywhere with me.',
  'Honestly the cutest one in the whole collection.',
  'They look a bit sleepy in this photo.',
  'I love how round they are.',
  'Happy early birthday to this little one!',
  'Is it just me or do they look like they’re smiling?',
  'This one has main character energy.',
  'The stitching looks really well made.',
  'I love the little details on the ears.',
  'This one looks like it has a lot of stories to tell.',
  'Perfect size for cuddling, I bet.',
  'The name suits them perfectly.',
  'I would protect this plushie with my life.',
  'They look so proud of themselves.',
  'That fur looks incredibly fluffy.',
  'This one would be great for movie nights.',
  'They seem like the quiet but wise type.',
  'I can tell this one is very loved.',
  'The eyes are so expressive!',
  'This made my whole day better.',
];

const replies = [
  'Right?? I thought the same thing.',
  'Agreed, 100%.',
  'They really do!',
  'Now I want one too.',
  'Haha, that would be adorable.',
  'I’ve been saying this for ages.',
  'Same, they’re my favourite too.',
  'Such a good point.',
  'This made me smile.',
  'Wait, you’re so right.',
  'I can confirm, they’re very huggable.',
  'Aww, thank you!',
  'That’s exactly what I was thinking.',
  'They look even cuter in person.',
  'You have such good taste.',
  'I laughed way too hard at this.',
  'Honestly, same.',
  'Okay, now I need a whole collection like this.',
  'This is so wholesome.',
  'Glad I’m not the only one!',
  'They absolutely deserve it.',
  'You’re making me want to go plushie shopping.',
  'Best comment on this page.',
  'I just showed this to my friend and they agree.',
];

const samples = [...topLevel, ...replies];

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

if (process.argv.includes('--remove')) {
  // Replies under them go too, through the database's cascade.
  const { count } = await db.comment.deleteMany({
    where: { body: { in: samples } },
  });
  console.log(`Removed ${count} sample comments.`);
  await db.$disconnect();
  process.exit(0);
}

if (await db.comment.count({ where: { body: { in: samples } } })) {
  console.error(
    'Sample comments are there already. Run with --remove first to start over.'
  );
  await db.$disconnect();
  process.exit(1);
}

const users = await db.user.findMany({
  where: { OR: [{ banned: false }, { banned: null }] },
  select: { id: true, name: true },
});
const plushies = await db.plushie.findMany({
  select: { id: true, name: true },
});
if (users.length === 0 || plushies.length === 0) {
  console.error('Needs at least one account and one plushie.');
  await db.$disconnect();
  process.exit(1);
}

// The same comments every run: a small seeded random number generator.
let seed = 20260925;
function random() {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}
const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

let created = 0;
for (const plushie of plushies) {
  const threads = 2 + Math.floor(random() * 4); // 2 to 5
  for (let t = 0; t < threads; t++) {
    const author = pick(users);
    const createdAt = new Date(Date.now() - (1 + random() * 13) * DAY);
    const edited = random() < 0.15;
    const top = await db.comment.create({
      data: {
        plushieId: plushie.id,
        authorId: author.id,
        body: pick(topLevel),
        createdAt,
        editedAt: edited
          ? new Date(createdAt.getTime() + (5 + random() * 55) * MINUTE)
          : null,
      },
    });
    created++;

    // Replies from others, a little later, sometimes answering each other.
    let parent = { id: top.id, authorId: author.id, at: createdAt.getTime() };
    const count = Math.floor(random() * 5); // 0 to 4
    for (let r = 0; r < count; r++) {
      const others = users.filter((user) => user.id !== parent.authorId);
      const replier = others.length > 0 ? pick(others) : author;
      const at = Math.min(
        parent.at + (10 + random() * 600) * MINUTE,
        Date.now() - MINUTE
      );
      const reply = await db.comment.create({
        data: {
          plushieId: plushie.id,
          authorId: replier.id,
          body: pick(replies),
          threadId: top.id,
          parentId: random() < 0.4 ? parent.id : top.id,
          createdAt: new Date(at),
        },
      });
      created++;
      parent = { id: reply.id, authorId: replier.id, at };
    }
  }
}

console.log(
  `Added ${created} sample comments on ${plushies.length} plushies by ${users.length} accounts.`
);
await db.$disconnect();
