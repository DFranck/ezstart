/** @type {import('next').NextConfig} */
const baseConfig = {
  transpilePackages: ['@ezstart/ui', '@ezstart/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'localhost',
      },
    ],
  },
}

export default baseConfig
