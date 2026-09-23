import { framePhoto, ogCard, ogSize } from '@/lib/og';
import { getPlushie, getPlushies } from '@/lib/plushies';
import { site } from '@/lib/site';

export const alt = `A plushie from ${site.name}, with their photo and description`;
export const size = ogSize;
export const contentType = 'image/png';

/** Build a card for every plushie ahead of time, like their pages. */
export async function generateStaticParams() {
  const plushies = await getPlushies();
  return plushies.map((plushie) => ({ slug: plushie.slug }));
}

/** The site's preview card, with this plushie's photo, name and details. */
export default async function PlushieOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plushie = await getPlushie(slug);

  if (!plushie) {
    return ogCard({
      photo: null,
      title: site.name,
      subtitle: 'Meet my soft friends',
      text: 'Names, birthdays, favorite things and photos, all in one cozy place.',
    });
  }

  return ogCard({
    photo: plushie.thumbnail ? await framePhoto(plushie.thumbnail.url) : null,
    title: plushie.name,
    subtitle:
      [plushie.species, plushie.pronouns].filter(Boolean).join(' · ') ||
      'One of my soft friends',
    text: plushie.description,
  });
}
