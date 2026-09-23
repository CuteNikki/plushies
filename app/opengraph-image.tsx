import { ogCard, ogSize } from '@/lib/og';
import { site } from '@/lib/site';

export const alt = `${site.name}: meet my soft friends. A cozy collection of plushies.`;
export const size = ogSize;
export const contentType = 'image/png';

export default function OpengraphImage() {
  return ogCard({
    photo: null,
    title: site.name,
    subtitle: 'Meet my soft friends',
    text: 'Names, birthdays, favorite things and photos, all in one cozy place.',
  });
}
