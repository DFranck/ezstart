import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: false,
  i18n: true,
  extend: {
    transpilePackages: ['@ezstart/next-theme'],

    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6170/api'}/:path*`,
        },
      ]
    },
  },
})
