import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  i18n: true,
  extend: {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6160/api'}/:path*`,
        },
      ]
    },
  },
})
// staging redeploy
