import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Photos uploaded through UploadThing.
    remotePatterns: [
      { protocol: 'https', hostname: '*.ufs.sh', pathname: '/f/*' },
    ],
  },
};

export default nextConfig;
