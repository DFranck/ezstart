import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  extend: {
    transpilePackages: ['@ezstart/auth-sdk'],
    eslint: {
      ignoreDuringBuilds: true
    }
  }
})