import createNextIntlPlugin from 'next-intl/plugin';
import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const baseConfig = {
  transpilePackages: ['@ezstart/ui', '@ezstart/ui'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'evento-media-bucket.s3.ap-southeast-2.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'hydro.cosmos.network',
      },
    ],
  },
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

export default withNextIntl(pwaConfig(baseConfig));
