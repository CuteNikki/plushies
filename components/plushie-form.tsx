'use client';

import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';

import type { Plushie, PlushieFact, PlushieImage } from '@/lib/plushies';
import { UploadDropzone } from '@/lib/uploadthing';
import { cn } from '@/lib/utils';

import {
  deletePlushie,
  discardUploads,
  savePlushie,
  type FormState,
} from '@/app/dashboard/actions';
import { BirthdayField } from '@/components/birthday-field';
import { Reveal } from '@/components/motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// A compact square tile, the same size as the photo previews next to it.
const dropzoneClassName = cn(
  'm-0 aspect-square w-full gap-0 rounded-xl border-2 border-dashed border-primary/30 bg-muted/40 p-3 transition-colors hover:border-primary/60',
  'ut-upload-icon:size-8 ut-upload-icon:text-primary/60',
  'ut-label:mt-1 ut-label:w-auto ut-label:text-xs ut-label:leading-4 ut-label:text-primary',
  'ut-allowed-content:text-[0.7rem] ut-allowed-content:text-muted-foreground',
  'ut-button:mt-2 ut-button:h-8 ut-button:w-auto ut-button:rounded-full ut-button:bg-primary ut-button:px-3 ut-button:text-xs ut-button:text-primary-foreground ut-button:ut-readying:bg-primary/60'
);

export function PlushieForm({ plushie }: { plushie?: Plushie }) {
  const [state, formAction, saving] = useActionState<FormState, FormData>(
    savePlushie,
    {}
  );
  const [thumbnail, setThumbnail] = useState(plushie?.thumbnail ?? null);
  const [gallery, setGallery] = useState(plushie?.gallery ?? []);
  const [facts, setFacts] = useState<PlushieFact[]>(plushie?.facts ?? []);
  const [uploadError, setUploadError] = useState<string>();
  const [deleting, startDelete] = useTransition();

  // Photos from this visit that aren't saved yet are cleaned up when removed.
  const savedKeys = new Set(
    [plushie?.thumbnail, ...(plushie?.gallery ?? [])].map((i) => i?.key)
  );
  function discard(image: PlushieImage) {
    if (!savedKeys.has(image.key)) void discardUploads([image.key]);
  }

  function moveImage(index: number, by: number) {
    setGallery((images) => {
      const next = [...images];
      const [image] = next.splice(index, 1);
      next.splice(index + by, 0, image);
      return next;
    });
  }

  function makeThumbnail(index: number) {
    const image = gallery[index];
    setGallery((images) => {
      const next = images.filter((_, i) => i !== index);
      // The old thumbnail moves into the gallery instead of disappearing.
      return thumbnail ? [thumbnail, ...next] : next;
    });
    setThumbnail(image);
  }

  const error = state.error ?? uploadError;

  return (
    <form action={formAction} className='flex flex-col gap-8'>
      {plushie && <input type='hidden' name='id' value={plushie.id} />}
      <input type='hidden' name='thumbnail' value={JSON.stringify(thumbnail)} />
      <input type='hidden' name='gallery' value={JSON.stringify(gallery)} />
      <input type='hidden' name='facts' value={JSON.stringify(facts)} />

      <Section
        title='Thumbnail'
        description='The main photo, shown on the home page and first on their page.'
      >
        <div className='w-48'>
          {thumbnail ? (
            <div className='relative overflow-hidden rounded-xl ring-1 ring-foreground/10'>
              <Photo image={thumbnail} />
              <Button
                type='button'
                size='icon'
                variant='secondary'
                className='absolute top-2 right-2 size-8 rounded-full'
                onClick={() => {
                  discard(thumbnail);
                  setThumbnail(null);
                }}
                aria-label='Remove thumbnail'
              >
                <X />
              </Button>
            </div>
          ) : (
            <UploadDropzone
              endpoint='plushieThumbnail'
              config={{ mode: 'auto', cn }}
              className={dropzoneClassName}
              content={{
                label: 'Drop a photo or click',
                allowedContent: 'One image, up to 8MB',
                button: 'Choose photo',
              }}
              onClientUploadComplete={([file]) => {
                setUploadError(undefined);
                if (file) setThumbnail({ key: file.key, url: file.ufsUrl });
              }}
              onUploadError={(err) => setUploadError(err.message)}
            />
          )}
        </div>
      </Section>

      <Section
        title='Gallery'
        description='More photos, shown on their page. Use the arrows to reorder.'
      >
        <ul className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
          {gallery.map((image, index) => (
            <li
              key={image.key}
              className='group relative overflow-hidden rounded-xl ring-1 ring-foreground/10'
            >
              <Photo image={image} />
              <div className='absolute inset-x-2 bottom-2 flex justify-between gap-1'>
                <div className='flex gap-1'>
                  <IconButton
                    label='Move left'
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                  >
                    <ArrowLeft />
                  </IconButton>
                  <IconButton
                    label='Move right'
                    disabled={index === gallery.length - 1}
                    onClick={() => moveImage(index, 1)}
                  >
                    <ArrowRight />
                  </IconButton>
                </div>
                <div className='flex gap-1'>
                  <IconButton
                    label='Use as thumbnail'
                    onClick={() => makeThumbnail(index)}
                  >
                    <Star />
                  </IconButton>
                  <IconButton
                    label='Remove photo'
                    onClick={() => {
                      discard(image);
                      setGallery((images) =>
                        images.filter((_, i) => i !== index)
                      );
                    }}
                  >
                    <X />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
          {/* The last tile adds more photos. */}
          <li>
            <UploadDropzone
              endpoint='plushieImage'
              config={{ mode: 'auto', cn }}
              className={dropzoneClassName}
              content={{
                label: 'Drop photos or click',
                allowedContent: 'Up to 20 at once, 8MB each',
                button: 'Add photos',
              }}
              onClientUploadComplete={(files) => {
                setUploadError(undefined);
                setGallery((images) => [
                  ...images,
                  ...files.map((file) => ({ key: file.key, url: file.ufsUrl })),
                ]);
              }}
              onUploadError={(err) => setUploadError(err.message)}
            />
          </li>
        </ul>
      </Section>

      <Section title='About'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field
            label='Name'
            name='name'
            required
            defaultValue={plushie?.name}
          />
          <Field
            label='URL name'
            name='slug'
            defaultValue={plushie?.slug}
            placeholder='Made from the name if empty'
            hint='Used in the link, e.g. /plushies/mochi'
          />
          <Field
            label='Species'
            name='species'
            defaultValue={plushie?.species}
            placeholder='Bunny'
          />
          <BirthdayField defaultValue={plushie?.birthday} />
          <Field label='Gender' name='gender' defaultValue={plushie?.gender} />
          <Field
            label='Pronouns'
            name='pronouns'
            defaultValue={plushie?.pronouns}
            placeholder='she/her'
          />
          <Field
            label='From'
            name='origin'
            defaultValue={plushie?.origin}
            placeholder='A claw machine in Tokyo'
          />
          <Field
            label='Traits'
            name='traits'
            defaultValue={plushie?.traits.join(', ')}
            placeholder='Sleepy, Gentle, Cuddly'
            hint='Separate with commas'
          />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='description'>Description</Label>
          <Textarea
            id='description'
            name='description'
            required
            rows={4}
            defaultValue={plushie?.description}
          />
        </div>
      </Section>

      <Section title='Facts' description='Anything else, e.g. Favorite food.'>
        {facts.map((fact, index) => (
          <div key={index} className='flex gap-2'>
            <Input
              aria-label='Fact name'
              placeholder='Favorite food'
              value={fact.label}
              onChange={(event) =>
                setFacts((all) =>
                  all.map((f, i) =>
                    i === index ? { ...f, label: event.target.value } : f
                  )
                )
              }
              className='max-w-48'
            />
            <Input
              aria-label='Fact value'
              placeholder='Strawberries'
              value={fact.value}
              onChange={(event) =>
                setFacts((all) =>
                  all.map((f, i) =>
                    i === index ? { ...f, value: event.target.value } : f
                  )
                )
              }
            />
            <Button
              type='button'
              variant='destructive'
              size='icon'
              aria-label='Remove Fact'
              onClick={() =>
                setFacts((all) => all.filter((_, i) => i !== index))
              }
            >
              <X />
            </Button>
          </div>
        ))}
        <Button
          type='button'
          variant='default'
          size='sm'
          className='w-fit'
          onClick={() => setFacts((all) => [...all, { label: '', value: '' }])}
        >
          <Plus />
          Add Fact
        </Button>
      </Section>

      {error && (
        <p className='rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive'>
          {error}
        </p>
      )}

      <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-6'>
        <div className='flex gap-2'>
          <Button type='submit' disabled={saving || deleting}>
            {saving && <Loader2 className='animate-spin' />}
            {plushie ? 'Save' : 'Create'}
          </Button>
          <Button type='button' variant='ghost' asChild>
            <Link href={plushie ? `/plushies/${plushie.slug}` : '/dashboard'}>
              Cancel
            </Link>
          </Button>
        </div>
        {plushie && (
          <Button
            type='button'
            variant='destructive'
            disabled={saving || deleting}
            onClick={() => {
              if (!confirm(`Delete ${plushie.name} and all their photos?`)) {
                return;
              }
              startDelete(() => deletePlushie(plushie.id));
            }}
          >
            {deleting ? <Loader2 className='animate-spin' /> : <Trash2 />}
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal as='section' className='flex flex-col gap-4'>
      <div>
        <h2 className='font-heading text-xl font-semibold'>{title}</h2>
        {description && (
          <p className='text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      {children}
    </Reveal>
  );
}

function Field({
  label,
  name,
  hint,
  defaultValue,
  ...props
}: {
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string | null;
} & Omit<React.ComponentProps<typeof Input>, 'defaultValue'>) {
  return (
    <div className='flex flex-col gap-2'>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue ?? ''}
        {...props}
      />
      {hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
    </div>
  );
}

function Photo({ image }: { image: PlushieImage }) {
  return (
    <div className='relative aspect-square bg-muted'>
      <Image
        src={image.url}
        alt=''
        fill
        sizes='(min-width: 1024px) 25vw, 50vw'
        className='object-cover'
      />
    </div>
  );
}

function IconButton({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Button>) {
  return (
    <Button
      type='button'
      size='icon'
      variant='secondary'
      className='size-7 rounded-full shadow disabled:opacity-40'
      aria-label={label}
      title={label}
      {...props}
    />
  );
}
