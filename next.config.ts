import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Photos are already kept at the sizes they're shown at (see
    // lib/photos.ts), so they load straight from storage instead of being
    // resized again by the host, whose plan limits that.
    unoptimized: true,
  },
};

export default nextConfig;
