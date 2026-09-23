# Plushies

A little website that shows all of my plushies. Built with Next.js and shadcn/ui.

## Running it

```bash
bun install
bun dev
```

Then open http://localhost:3000.

## Adding a plushie

1. Put a photo in `public/plushies/`, e.g. `public/plushies/mochi.jpg`.
2. Add an entry to the list in `lib/plushies.ts`:

```ts
{
  slug: 'mochi',                  // used in the URL: /plushies/mochi
  name: 'Mochi',
  image: '/plushies/mochi.jpg',
  species: 'Bunny',
  birthday: '2021-04-02',         // the age is calculated from this
  gender: 'Girl',
  pronouns: 'she/her',
  description: 'A very round bunny…',
  origin: 'A tiny shop in a train station',
  facts: { 'Favorite food': 'Strawberry daifuku' },
  traits: ['Sleepy', 'Cuddly'],
},
```

Only `slug`, `name` and `description` are required. Leave out anything you don't want to show.

## Colors

The pink/purple theme lives in `app/globals.css` (`:root` for light mode, `.dark` for dark mode).
