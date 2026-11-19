import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // A server of its own, with only the files it needs, for the Docker image
  output: 'standalone',
  images: {
    // Photos are already kept at the sizes they're shown at (see
    // lib/photos.ts), so they load straight from storage instead of being
    // resized again by the host, whose plan limits that.
    unoptimized: true,
  },
};

export default nextConfig;
