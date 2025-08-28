/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ezstart/ui', '@ez-billing/types'],
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
};

export default nextConfig;