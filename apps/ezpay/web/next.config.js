import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  extend: {
    transpilePackages: ['@ezstart/pay-sdk', '@ezstart/next-theme'],
    eslint: {
      ignoreDuringBuilds: true
    }
  }
})
