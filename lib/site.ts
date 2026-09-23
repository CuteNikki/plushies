/** Shared by the metadata, manifest, icons and social preview image. */
export const site = {
  name: 'Plushies',
  title: 'Plushies · Meet my soft friends',
  description:
    'Meet all of my plushies! Their names, birthdays, favorite things and photos, all in one cozy place.',
  /** Where the site runs, for absolute links in previews. */
  url: new URL(
    process.env.SITE_URL ??
      process.env.BETTER_AUTH_URL ??
      'http://localhost:3000'
  ),
};

/** The theme's colors in hex, for places that can't read the CSS variables. */
export const brand = {
  light: { background: '#fdf8fd', primary: '#cd3f9b' },
  dark: {
    background: '#130c19',
    card: '#201528',
    primary: '#ef8bc5',
    foreground: '#f8eef7',
    muted: '#b6a3bb',
  },
};

/** The Lucide heart from the header, on a 24×24 grid. */
export const heartPath =
  'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5';
