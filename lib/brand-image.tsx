import { ImageResponse } from 'next/og';

import { brand, heartPath } from '@/lib/site';

/** The header's heart, as an inline SVG that ImageResponse can draw. */
export function Heart({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24'>
      <defs>
        <linearGradient id='heart' x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0' stopColor={brand.dark.primary} />
          <stop offset='1' stopColor={brand.light.primary} />
        </linearGradient>
      </defs>
      <path d={heartPath} fill='url(#heart)' />
    </svg>
  );
}

/**
 * A square app icon: the heart on the dark card color, filling the whole
 * image. Phones and launchers round the corners themselves. The heart stays
 * inside the middle 80% so masked icons don't cut it off.
 */
export function appIcon(size: number) {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: brand.dark.card,
      }}
    >
      <Heart size={Math.round(size * 0.6)} />
    </div>,
    { width: size, height: size }
  );
}
