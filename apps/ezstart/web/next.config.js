import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  i18n: true,
  extend: {
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
  }
})
// staging redeploy
