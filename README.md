# Plushies

A little website that shows all of my plushies: their names, birthdays, favorite things and photos. Visitors can sign in to like plushies and leave comments; editors and admins look after the collection from a dashboard.

Built with Next.js 16, React 19, Tailwind CSS 4 and shadcn/ui, with Prisma on Postgres, Better Auth for accounts, photos on our own server (Garage at images.niso.moe) and Nodemailer for emails, sent through our own mail server (Stalwart at mail.niso.moe). Bun runs the scripts and tests.

## Setup

You need [Bun](https://bun.sh), Node 22.12 or newer (older versions break the Prisma CLI), a Postgres database, and Docker if you want to run the tests.

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
| `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY` | The photo storage's key (see [Photos](#photos)), for uploading and deleting photos. `STORAGE_REGION` is `garage` unless set. |
| `SMTP_URL`, `EMAIL_FROM` | For every email the site sends. `SMTP_URL` logs in to the mail server, with the `@` in the username written as `%40`: `smtps://no-reply%40niso.moe:password@mail.niso.moe`. `EMAIL_FROM` is optional (`Plushies <no-reply@niso.moe>`) and must be an address of that account. |
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
- `/dashboard/plushies`: the plushie list with search, sorting, filters and views such as upcoming birthdays. **New plushie** opens the form; only the name and description are required. Each plushie has a thumbnail and a gallery of extra photos (see [Photos](#photos)).
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

## Photos

Photos are kept on our own server, in [Garage](https://garagehq.deuxfleurs.fr), an S3-compatible store, and load from `https://images.niso.moe` (`PHOTO_ORIGIN` in `lib/photos.ts`). The browser makes each photo in two sizes before it goes, small for cards and lists and large for its plushie's page (`PHOTO_SIZES`), asks the site for links to upload them to (`requestUpload`), and sends them there itself. The links last 5 minutes and are signed for that file's type and size. The site saves the large one's URL, and pages show the small one unless they need the large one, straight from storage: the host doesn't resize them, since its plan limits that (`images.unoptimized` in `next.config.ts`).

Each photo is a folder `<database>/<id>/` with `large.webp` and `small.webp` (`.jpg` from a browser that can't write WebP). `<database>` is named after the database (`uploadOwner` in `lib/uploads.ts`), so the cleanup after saving only deletes this database's photos, not those of a local copy on the same storage.

It's the server's shared image storage (`~/services/storage`, container `image-storage`), which [Tinderhaj](https://github.com/CuteNikki/Tinderhaj) uses too, with a bucket of its own:

1. Point `images.niso.moe` at the server (an A record; on Cloudflare, DNS only, so Caddy can get its certificate).
2. Make the bucket, with `garage` standing for `docker exec image-storage /garage`. The bucket is named after its address, which is how Garage knows which one a photo is read from:
   ```sh
   garage bucket create images.niso.moe
   garage bucket website --allow images.niso.moe
   garage bucket set-quotas images.niso.moe --max-size 10GiB   # STORAGE_LIMIT_BYTES in lib/uploads.ts
   garage key create plushies-site      # its Key ID and Secret key are STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY
   garage bucket allow --read --write --owner images.niso.moe --key plushies-site
   ```
3. Let the site's pages upload to it: with that key, put a CORS rule on the bucket allowing `PUT` with a `content-type` header from `https://plushies.niso.moe` and `http://localhost:3000`.
4. Add it to the Caddyfile. Garage's S3 API only takes `*.tinderhaj.com` addresses as bucket names, so here the bucket goes in the path, and everything under `/images.niso.moe/` is uploading, listing and deleting:
   ```caddyfile
   images.niso.moe {
   	request_body {
   		max_size 10MB
   	}
   	@api path /images.niso.moe /images.niso.moe/*
   	handle @api {
   		reverse_proxy image-storage:3900
   	}
   	handle {
   		# A photo never changes: a new one gets a new address
   		header Cache-Control "public, max-age=31536000, immutable"
   		header Content-Security-Policy "default-src 'none'; sandbox"
   		header X-Content-Type-Options nosniff
   		reverse_proxy image-storage:3902
   	}
   }
   ```

## Changing the data model

Edit `prisma/schema.prisma`, then run `bun db:migrate` to create and apply a migration. In production, run `bun db:deploy`.

## Tests

Tests live in `tests/`, one file per area: plushies and photos, comments, likes and user management, bans, reverts, two-step sign-in, account settings, activity, and rules like birthdays. They need Docker running:

```bash
bun run test                           # all of them
bun run test tests/comments.test.ts    # one file
```

Each run starts a throwaway Postgres in Docker, applies the migrations and removes it again afterwards. The tests empty the database before each test, so they refuse to run against anything else. Don't run plain `bun test`: without the throwaway database it stops right away. Emails are recorded instead of sent, and the photo storage is replaced by a pretend one.

## Look and feel

The pink and purple theme lives in `app/globals.css` (`:root` for light mode, `.dark` for dark mode). The site's name, description and the theme colors used outside CSS (icons, link previews) are in `lib/site.ts`.
