import createNextIntlPlugin from 'next-intl/plugin';

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
export default withNextIntl(baseConfig);
