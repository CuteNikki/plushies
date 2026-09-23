import 'server-only';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ImageResponse } from 'next/og';
import sharp from 'sharp';

import { Heart } from '@/lib/brand-image';
import { brand } from '@/lib/site';

/** Link preview size, shared by every opengraph-image file. */
export const ogSize = { width: 1200, height: 630 };

// The site's own fonts, read once from local files (ImageResponse can't use
// the woff2 files next/font downloads).
const fontDir = join(process.cwd(), 'node_modules/@fontsource');
const fonts = Promise.all([
  readFile(join(fontDir, 'fredoka/files/fredoka-latin-600-normal.woff')),
  readFile(join(fontDir, 'nunito/files/nunito-latin-600-normal.woff')),
]);

const FRAME = 300;

/**
 * A photo as a square PNG data URL for the preview frame. Converting first
 * means any uploaded format works, and GIFs use their first frame.
 */
export async function framePhoto(url: string) {
  // Cached, so the preview can be built ahead of time like the page.
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) return null;
  const png = await sharp(Buffer.from(await response.arrayBuffer()))
    .resize(FRAME * 2, FRAME * 2, { fit: 'cover' })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

/**
 * The link preview card: a rounded frame on the left (a photo, or the heart)
 * and a title, subtitle and text on the right, in the site's dark theme.
 */
export async function ogCard({
  photo,
  title,
  subtitle,
  text,
}: {
  /** A data URL from framePhoto, or null for the heart. */
  photo: string | null;
  title: string;
  subtitle: string;
  text: string;
}) {
  const [fredoka, nunito] = await fonts;

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
          width: FRAME,
          height: FRAME,
          flexShrink: 0,
          overflow: 'hidden',
          borderRadius: 72,
          background: brand.dark.card,
          border: `4px solid ${brand.dark.primary}33`,
        }}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=''
            width={FRAME}
            height={FRAME}
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <Heart size={190} />
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            fontFamily: 'Fredoka',
            fontSize: title.length > 12 ? 76 : 92,
            lineHeight: 1,
            color: brand.dark.primary,
          }}
        >
          {title}
        </div>
        <div style={{ fontFamily: 'Fredoka', fontSize: 48, lineHeight: 1.1 }}>
          {subtitle}
        </div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.4,
            color: brand.dark.muted,
            maxWidth: 620,
            // Long descriptions stop after three lines.
            display: 'block',
            lineClamp: 3,
          }}
        >
          {text}
        </div>
      </div>
    </div>,
    {
      ...ogSize,
      fonts: [
        { name: 'Fredoka', data: fredoka, weight: 600, style: 'normal' },
        { name: 'Nunito', data: nunito, weight: 600, style: 'normal' },
      ],
    }
  );
}
