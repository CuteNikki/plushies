// Usage: bun run make-admin you@example.com
// Sign in on the site once first so the account exists.
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../lib/generated/prisma/client';

const email = process.argv[2];
if (!email) {
  console.error('Usage: bun run make-admin you@example.com');
  process.exit(1);
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const user = await db.user.findUnique({ where: { email } });
if (user) {
  await db.user.update({ where: { email }, data: { role: 'admin' } });
  console.log(`${user.name} (${email}) is now an admin.`);
} else {
  console.error(`No account for ${email}. Sign in on the site first.`);
  process.exitCode = 1;
}

await db.$disconnect();
