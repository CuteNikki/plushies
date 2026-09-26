import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getMentionOptions,
  getPlushie,
  getPlushies,
  type Plushie,
} from '@/data/plushies';
import { formatBirthday } from '@/lib/birthday';
import { mentionedIds, mentionsToText } from '@/lib/mentions';
import { site } from '@/lib/site';

import { BackButton } from '@/components/back-button';
import { Comments } from '@/components/comments';
import { DeletePlushieButton } from '@/components/delete-plushie-button';
import { EditPlushieButton } from '@/components/edit-plushie-button';
import { LikeButton } from '@/components/like-button';
import { MentionText } from '@/components/mention-text';
import {
  Reveal,
  RevealGroup,
  RevealItem,
  RevealQueue,
} from '@/components/motion';
import { PlushieAge } from '@/components/plushie-age';
import { PlushiePhoto } from '@/components/plushie-photo';
import { PlushiePhotos } from '@/components/plushie-photos';
import { Badge } from '@/components/ui/badge';
import { Toaster } from '@/components/ui/sonner';

export async function generateStaticParams() {
  const plushies = await getPlushies();
  return plushies.map((plushie) => ({ slug: plushie.slug }));
}

/** Who mentions can link to, by id. */
async function mentionTargets() {
  const plushies = await getPlushies();
  return new Map(plushies.map((plushie) => [plushie.id, plushie]));
}

/** Everything a plushie says, where they can mention others. */
function mentionableTexts(plushie: Plushie) {
  return [plushie.description, ...plushie.facts.map((fact) => fact.value)];
}

export async function generateMetadata(
  props: PageProps<'/plushies/[slug]'>
): Promise<Metadata> {
  const { slug } = await props.params;
  const plushie = await getPlushie(slug);
  if (!plushie) return {};
  const description = mentionsToText(
    plushie.description,
    await mentionTargets()
  );

  // The preview image comes from opengraph-image.tsx next to this page.
  // openGraph replaces the layout's, so the shared fields are repeated here.
  return {
    title: plushie.name,
    description,
    openGraph: {
      type: 'profile',
      siteName: site.name,
      title: `${plushie.name} · ${site.name}`,
      description,
      url: `/plushies/${plushie.slug}`,
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${plushie.name} · ${site.name}`,
      description,
    },
  };
}

export default async function PlushiePage(
  props: PageProps<'/plushies/[slug]'>
) {
  const { slug } = await props.params;
  const plushie = await getPlushie(slug);
  if (!plushie) notFound();
  const targets = await mentionTargets();
  // In your order, like the home page.
  const groupMates = plushie.group
    ? [...targets.values()].filter(
        (other) =>
          other.group?.id === plushie.group!.id && other.id !== plushie.id
      )
    : [];
  // Not their group, which is listed already and usually mentions them.
  const mentionedBy = [...targets.values()].filter(
    (other) =>
      other.id !== plushie.id &&
      !groupMates.includes(other) &&
      mentionableTexts(other).some((text) =>
        mentionedIds(text).includes(plushie.id)
      )
  );

  const details: [string, React.ReactNode][] = [
    ['Species', plushie.species],
    ['From', plushie.origin],
    ['Age', plushie.birthday && <PlushieAge birthday={plushie.birthday} />],
    ['Birthday', plushie.birthday && formatBirthday(plushie.birthday)],
    ['Gender', plushie.gender],
    ['Pronouns', plushie.pronouns],
    ...plushie.facts.map(({ label, value }): [string, React.ReactNode] => [
      label,
      <MentionText key={label} text={value} targets={targets} />,
    ]),
  ];

  return (
    <div className='flex flex-col gap-4'>
      <Reveal className='flex items-center justify-between gap-2'>
        <BackButton href='/'>All plushies</BackButton>
        <div className='flex flex-wrap gap-2'>
          <EditPlushieButton id={plushie.id} />
          <DeletePlushieButton
            plushie={{ id: plushie.id, name: plushie.name }}
          />
        </div>
      </Reveal>

      {/* Photos come in from the left and details from the right, each column
          as its own sequence so both play at the same time. */}
      <article className='grid gap-8 md:grid-cols-2'>
        <RevealQueue delay={0.1}>
          <PlushiePhotos plushie={plushie} />
        </RevealQueue>

        <RevealQueue delay={0.2}>
          <div className='flex flex-col gap-6'>
            <RevealGroup interval={0.12} className='flex flex-col gap-2'>
              <RevealItem
                direction='left'
                className='flex items-start justify-between gap-4'
              >
                <h1 className='min-w-0 font-heading text-4xl font-semibold tracking-tight wrap-break-word sm:text-5xl'>
                  {plushie.name}
                </h1>
                <LikeButton
                  plushieId={plushie.id}
                  slug={plushie.slug}
                  count={plushie.likes}
                />
              </RevealItem>
              {plushie.traits.length > 0 && (
                <RevealItem direction='left' className='flex flex-wrap gap-2'>
                  {plushie.traits.map((trait) => (
                    <Badge key={trait} variant='secondary'>
                      {trait}
                    </Badge>
                  ))}
                </RevealItem>
              )}
              <RevealItem
                as='p'
                direction='left'
                className='mt-3 text-base leading-relaxed'
              >
                <MentionText text={plushie.description} targets={targets} />
              </RevealItem>
            </RevealGroup>

            <RevealGroup
              as='dl'
              interval={0.08}
              className='grid grid-cols-2 gap-2'
            >
              {details
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <RevealItem
                    key={label}
                    direction='left'
                    className='rounded-xl bg-muted/60 px-4 py-3 ring-1 ring-foreground/5'
                  >
                    <dt className='text-xs text-muted-foreground'>{label}</dt>
                    <dd className='font-heading text-base font-medium'>
                      {value}
                    </dd>
                  </RevealItem>
                ))}
            </RevealGroup>

            {plushie.group && groupMates.length > 0 && (
              <PlushieLinks
                title={`Also in ${plushie.group.name}`}
                plushies={groupMates}
              />
            )}
            {mentionedBy.length > 0 && (
              <PlushieLinks title='Mentioned by' plushies={mentionedBy} />
            )}
          </div>
        </RevealQueue>
      </article>

      <Reveal className='mt-6'>
        <Comments
          plushieId={plushie.id}
          slug={plushie.slug}
          plushies={await getMentionOptions()}
        />
      </Reveal>
      {/* For the comments. */}
      <Toaster />
    </div>
  );
}

/** Other plushies as little photo-and-name links, under a small title. */
function PlushieLinks({
  title,
  plushies,
}: {
  title: string;
  plushies: Plushie[];
}) {
  return (
    <RevealGroup as='section' interval={0.08} className='flex flex-col gap-2'>
      <RevealItem direction='left'>
        <h2 className='text-xs text-muted-foreground'>{title}</h2>
      </RevealItem>
      <RevealItem direction='left' className='flex flex-wrap gap-2'>
        {plushies.map((other) => (
          <Link
            key={other.id}
            href={`/plushies/${other.slug}`}
            className='flex items-center gap-2 rounded-full bg-muted/60 py-1 pr-3.5 pl-1 font-heading text-sm font-medium ring-1 ring-foreground/5 transition-colors hover:bg-muted'
          >
            <PlushiePhoto
              plushie={other}
              sizes='28px'
              compact
              className='size-7 rounded-full'
            />
            {other.name}
          </Link>
        ))}
      </RevealItem>
    </RevealGroup>
  );
}
