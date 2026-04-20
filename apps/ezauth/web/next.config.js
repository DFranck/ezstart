import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  i18n: true,
  i18nRequestPath: './src/i18n.ts',
  extend: {
    transpilePackages: [],
    eslint: {
      ignoreDuringBuilds: true,
    },
    // Include SDK README in the serverless function bundle so /docs page can read it at runtime
    outputFileTracingIncludes: {
      '/**/docs/**': ['../../../packages/auth-sdk/README.md'],
    },
  },
})
