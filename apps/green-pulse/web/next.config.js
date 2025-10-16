import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  i18n: true,
  extend: {
    transpilePackages: ['@ezstart/auth-sdk', '@ezstart/next-theme'],
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5070/api'}/:path*`,
        },
      ]
    },
  }
})
