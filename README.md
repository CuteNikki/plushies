# Plushies

A little website that shows all of my plushies: their names, birthdays, favorite things and photos. Visitors can sign in to like plushies and leave comments; editors and admins look after the collection from a dashboard.

Built with Next.js 16, React 19, Tailwind CSS 4 and shadcn/ui, with Prisma on Postgres, Better Auth for accounts, UploadThing for photos and Resend for emails. Bun runs the scripts and tests.

## Setup

You need [Bun](https://bun.sh), Node 24.21 or newer (for the Prisma CLI), a Postgres database, and Docker if you want to run the tests.

1. Copy `.env.example` to `.env` and fill it in (see below).
2. Install, set up the database and start the site:

```bash
bun install          # also runs prisma generate
bun db:migrate       # creates the tables
bun db:seed          # adds the starter plushies
bun dev
```

Then open http://localhost:3000.

### Environment variables

| Variable | What it's for |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. |
| `BETTER_AUTH_SECRET` | A long random string, e.g. from `openssl rand -base64 32`. Also encrypts the stored Discord tokens and two-step sign-in secrets, so don't change it once people have accounts. |
| `BETTER_AUTH_URL` | Where the site runs. Passkeys only work on this address. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | From a Discord app's OAuth2 page. Its redirect URL is `<BETTER_AUTH_URL>/api/auth/callback/discord`. |
| `UPLOADTHING_TOKEN` | From the UploadThing dashboard, for photo uploads. |
| `RESEND_API_KEY`, `EMAIL_FROM` | For every email the site sends. `EMAIL_FROM` must use a domain verified in Resend. |
| `IPINFO_TOKEN` | Optional. Shows a country and network provider next to each session in account settings. |
| `SITE_URL` | Optional. The public address used in link previews; defaults to `BETTER_AUTH_URL`. |

## Accounts and roles

People sign up at `/sign-in` with email and password, Discord, or later a passkey. Email accounts get a link to verify their address; Discord accounts count as verified already.

| Role | Can |
| --- | --- |
| **User** | Look around, like plushies, and comment once their email is verified. |
| **Editor** | Also add, edit and delete plushies, and delete anyone's comments. |
| **Admin** | Everything, plus changing roles, banning people, signing them out, sending password reset links, viewing the site as them, and deleting accounts. |

New accounts are users. To make yourself the first admin, sign in once and then run:

```bash
bun run make-admin you@example.com
```

The only admin can't delete their own account until someone else is an admin too.

### Account settings

Everyone manages their own account at `/account`: name, email address, password, linked Discord account, passkeys, two-step sign-in, and the list of signed-in sessions. Two-step sign-in applies to password sign-ins and uses an authenticator app or emailed codes, with backup codes. Changing a verified email and deleting an account both need a link from the current email address first.

## The site

**Public pages**

- `/`: all plushies as cards.
- `/plushies/<slug>`: one plushie with its details, photo gallery, likes and comments. Comments nest as replies, can be edited and deleted, and don't allow links. Length limit, paging and posting rate are in `lib/comment-rules.ts`.
- `/imprint`, `/privacy`, `/terms`: the legal pages. The operator's contact details live in `components/legal.tsx`.

**Dashboard** (editors and admins)

- `/dashboard`: an overview with counts, recently edited plushies, ones that need attention, recent comments, upcoming birthdays, new accounts (admins only) and photo storage.
- `/dashboard/plushies`: the plushie list with search, sorting, filters and views such as upcoming birthdays. **New plushie** opens the form; only the name and description are required. Each plushie has a thumbnail and a gallery of extra photos, uploaded through UploadThing.
- `/dashboard/photos`: every uploaded photo.
- `/dashboard/comments`: every comment, for moderating.
- `/dashboard/activity`: a log of changes to plushies, accounts and moderated comments, kept for 90 days. Editors see plushies and comments; admins also see accounts. Most changes can be reverted from here, as long as nothing newer has changed the same thing since.
- `/dashboard/users` and `/dashboard/users/<id>` (admins only): accounts, roles, bans and the other admin actions.

Bans last a day, three days, a week, a month or until lifted, with an optional reason. Banned people can't sign in; they land on `/banned`, which tells them why and until when. Admins can't be banned.

While an admin views the site as someone else, a banner says so and nothing can be changed.

## Scripts

| Command | What it does |
| --- | --- |
| `bun dev` | Runs the site locally. |
| `bun run build`, `bun start` | Builds and serves the production site. |
| `bun lint`, `bun typecheck`, `bun format` | ESLint, TypeScript and Prettier. |
| `bun run test` | The tests (see below). |
| `bun db:migrate` | Creates a migration from schema changes and applies it. |
| `bun db:deploy` | Applies migrations in production. |
| `bun db:seed` | Adds the starter plushies. |
| `bun db:studio` | Opens Prisma Studio to browse the database. |
| `bun run make-admin <email>` | Makes an existing account an admin. |
| `bun run sample-comments [--remove]` | Adds sample comments by the existing accounts, or takes them out again. |
| `bun run encrypt-oauth-tokens [--write]` | Encrypts Discord tokens stored before encryption was turned on. Without `--write` it only reports. |

## Where things are

- `app/`: pages and API routes.
- `actions/`: server actions for changing things (plushies, comments, likes, users, account, activity).
- `data/`: server-side queries the pages read from.
- `lib/`: auth, permissions, emails, the activity log, bans and other shared logic. `lib/generated/` is Prisma's generated client; don't edit it.
- `components/`: the site's components; `components/ui/` holds the shadcn/ui ones.
- `prisma/`: the schema, migrations and seed.
- `scripts/`: the scripts above.
- `tests/`: the tests.

This Next.js version differs from older ones in places. Check `node_modules/next/dist/docs/` before relying on how things used to work.

## Changing the data model

Edit `prisma/schema.prisma`, then run `bun db:migrate` to create and apply a migration. In production, run `bun db:deploy`.

## Tests

Tests live in `tests/`, one file per area: plushies and photos, comments, likes and user management, bans, reverts, two-step sign-in, account settings, activity, and rules like birthdays. They need Docker running:

```bash
bun run test                           # all of them
bun run test tests/comments.test.ts    # one file
```

Each run starts a throwaway Postgres in Docker, applies the migrations and removes it again afterwards. The tests empty the database before each test, so they refuse to run against anything else. Don't run plain `bun test`: without the throwaway database it stops right away. Emails are recorded instead of sent, and UploadThing is replaced by a pretend file store.

## Look and feel

The pink and purple theme lives in `app/globals.css` (`:root` for light mode, `.dark` for dark mode). The site's name, description and the theme colors used outside CSS (icons, link previews) are in `lib/site.ts`.
