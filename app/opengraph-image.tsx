import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';

import { Heart } from '@/lib/brand-image';
import { brand, site } from '@/lib/site';

export const alt = `${site.name}: meet my soft friends. A cozy collection of plushies.`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// The site's own fonts, read once from local files (ImageResponse can't use
// the woff2 files next/font downloads).
const fonts = join(process.cwd(), 'node_modules/@fontsource');
const [fredoka, nunito] = await Promise.all([
  readFile(join(fonts, 'fredoka/files/fredoka-latin-600-normal.woff')),
  readFile(join(fonts, 'nunito/files/nunito-latin-600-normal.woff')),
]);

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 72,
        padding: '0 96px',
        background: `radial-gradient(circle at 20% 30%, ${brand.dark.card}, ${brand.dark.background} 70%)`,
        color: brand.dark.foreground,
        fontFamily: 'Nunito',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 300,
          height: 300,
          flexShrink: 0,
          borderRadius: 72,
          background: brand.dark.card,
          border: `4px solid ${brand.dark.primary}33`,
        }}
      >
        <Heart size={190} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            fontFamily: 'Fredoka',
            fontSize: 92,
            lineHeight: 1,
            color: brand.dark.primary,
          }}
        >
          {site.name}
        </div>
        <div style={{ fontFamily: 'Fredoka', fontSize: 48, lineHeight: 1.1 }}>
          Meet my soft friends
        </div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.4,
            color: brand.dark.muted,
            maxWidth: 620,
          }}
        >
          Names, birthdays, favorite things and photos, all in one cozy place.
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: 'Fredoka', data: fredoka, weight: 600, style: 'normal' },
        { name: 'Nunito', data: nunito, weight: 600, style: 'normal' },
      ],
    }
  );
}
