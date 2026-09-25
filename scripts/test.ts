/**
 * Runs the tests against a throwaway Postgres in Docker, never the real
 * database: `bun run test`, plus any `bun test` arguments, e.g. a file name.
 * The container is removed afterwards, whatever happens.
 */
import { $ } from 'bun';

const name = `plushies-test-${process.pid}`;

function removeContainer() {
  Bun.spawnSync(['docker', 'rm', '-f', name], {
    stdout: 'ignore',
    stderr: 'ignore',
  });
}
process.on('SIGINT', () => {
  removeContainer();
  process.exit(130);
});

try {
  console.log('Starting a test database…');
  await $`docker run -d --rm --name ${name} -e POSTGRES_PASSWORD=test -e POSTGRES_DB=plushies_test -p 127.0.0.1::5432 postgres:17-alpine`.quiet();
  const port = (await $`docker port ${name} 5432/tcp`.text())
    .trim()
    .split(':')
    .pop();

  // Over TCP: while the image sets itself up, it only listens on a socket.
  for (let tries = 0; ; tries++) {
    const ready =
      await $`docker exec ${name} pg_isready -h 127.0.0.1 -U postgres -d plushies_test`
        .quiet()
        .nothrow();
    if (ready.exitCode === 0) break;
    if (tries > 60) throw new Error('The test database didn’t start');
    await Bun.sleep(500);
  }

  // Only what the tests need, so nothing from .env comes along.
  const env = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    NODE_ENV: 'test',
    DATABASE_URL: `postgresql://postgres:test@127.0.0.1:${port}/plushies_test`,
    BETTER_AUTH_SECRET: crypto.randomUUID() + crypto.randomUUID(),
    BETTER_AUTH_URL: 'http://localhost:3000',
    DISCORD_CLIENT_ID: 'test',
    DISCORD_CLIENT_SECRET: 'test',
  };
  await $`bun x prisma migrate deploy`.env(env).quiet();

  const tests = Bun.spawn(
    ['bun', '--no-env-file', 'test', ...process.argv.slice(2)],
    { env, stdio: ['inherit', 'inherit', 'inherit'] }
  );
  process.exitCode = await tests.exited;
} finally {
  removeContainer();
}
