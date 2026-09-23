# Plushies

A little website that shows all of my plushies. Built with Next.js, shadcn/ui, Prisma (Postgres), Better Auth and UploadThing.

## Setup

1. Copy `.env.example` to `.env` and fill it in (database, auth secret, Discord app, UploadThing token).
2. Install and set up the database:

```bash
bun install          # also runs prisma generate
bun db:migrate       # creates the database and tables
bun db:seed          # adds the starter plushies
bun dev
```

Then open http://localhost:3000.

## Accounts and roles

Sign in at `/sign-in` with email and password or Discord. New accounts can only look around. Forgotten passwords can be reset from the sign-in page; the reset link is emailed through Resend.

- **Editor**: can add, edit and delete plushies at `/admin`.
- **Admin**: everything an editor can do, plus changing people's roles at `/admin/users`.

To make yourself the first admin, sign in once and then run:

```bash
bun run make-admin you@example.com
```

## Adding a plushie

Go to `/admin` and click **New plushie**. Each plushie has a thumbnail (shown on the home page) and a gallery of extra photos, all uploaded through UploadThing. Only the name and description are required.

## Changing the data model

Edit `prisma/schema.prisma`, then run `bun db:migrate` to create a migration. In production, run `bun db:deploy` to apply migrations.

## Colors

The pink/purple theme lives in `app/globals.css` (`:root` for light mode, `.dark` for dark mode).
