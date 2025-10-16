import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  i18n: true,
  extend: {
    transpilePackages: ['@ezstart/types'],
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'localhost',
        },
      ],
    },
  }
})
