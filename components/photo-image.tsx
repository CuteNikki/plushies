'use client';

import Image from 'next/image';
import { useState } from 'react';

import { HeartCrackIcon } from 'lucide-react';

import { photoUrl } from '@/lib/photos';

/**
 * A photo filling its box, or the missing photo in its place when it doesn't
 * load, e.g. when its file is gone from storage. `src` is the photo's saved
 * URL, shown in its small size unless `large`.
 */
export function PhotoImage({
  compact,
  large,
  ...props
}: React.ComponentProps<typeof Image> & {
  src: string;
  compact?: boolean;
  /** For the one big photo on a plushie's page. */
  large?: boolean;
}) {
  // By URL, so a different photo gets its own try.
  const [failedSrc, setFailedSrc] = useState<string>();

  if (failedSrc === props.src) return <MissingPhoto compact={compact} />;
  return (
    <Image
      {...props}
      src={photoUrl(props.src, large ? 'large' : 'small')}
      alt={props.alt}
      onError={(event) => {
        setFailedSrc(props.src);
        props.onError?.(event);
      }}
    />
  );
}

/** Fills its box in place of a photo that isn't there. */
export function MissingPhoto({ compact }: { compact?: boolean }) {
  return (
    <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 bg-linear-to-br from-accent via-muted to-secondary text-primary/60'>
      <HeartCrackIcon className='size-1/2 fill-current' />
      {!compact && <span className='font-heading text-sm'>Missing Photo</span>}
    </div>
  );
}
