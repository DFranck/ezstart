import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  i18n: true,
  i18nRequestPath: './src/i18n.ts',
  extend: {
    transpilePackages: ['@ezstart/auth-sdk'],
    eslint: {
      ignoreDuringBuilds: true,
    },
  },
})