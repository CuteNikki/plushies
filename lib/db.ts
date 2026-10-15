import { PrismaPg } from '@prisma/adapter-pg';
import { attachDatabasePool } from '@vercel/functions';
import { Pool } from 'pg';

import { PrismaClient } from '@/lib/generated/prisma/client';

// The database server is shared with other sites and services, so each pool stays small. A build prerenders pages in
// one worker per CPU, each with its own pool, so there each gets even fewer.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

function createClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: isBuild ? 2 : 5,
  });
  // Lets Vercel close idle connections before it suspends the function, instead of leaving them open on the server.
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Reuse one client across hot reloads in development.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
