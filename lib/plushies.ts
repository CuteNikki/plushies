export type Plushie = {
  /** Used in the URL, e.g. /plushies/mochi. Lowercase, no spaces. */
  slug: string;
  name: string;
  /** Path to a photo inside /public, e.g. '/plushies/mochi.jpg'. */
  image?: string;
  /** What kind of plushie it is, e.g. 'Bunny', 'Shark', 'Frog'. */
  species?: string;
  /** Birthday as YYYY-MM-DD. The age is calculated from this automatically. */
  birthday?: string;
  gender?: string;
  pronouns?: string;
  description: string;
  /** Where they came from, e.g. 'IKEA', 'A claw machine in Tokyo'. */
  origin?: string;
  /** Any extra facts you want to show, e.g. { 'Favorite food': 'Strawberries' }. */
  facts?: Record<string, string>;
  /** Little personality tags shown as badges. */
  traits?: string[];
};

export const plushies: Plushie[] = [
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
    facts: {
      'Favorite food': 'Strawberry daifuku',
      'Favorite spot': 'The middle pillow',
    },
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
    facts: {
      'Favorite food': 'Swedish meatballs',
      'Hidden talent': 'Emotional support',
    },
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
    traits: ['Chaotic', 'Cheerful'],
  },
];

export function getPlushie(slug: string) {
  return plushies.find((plushie) => plushie.slug === slug);
}
