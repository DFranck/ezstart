import { createNextConfig } from '@ezstart/next-config/compose'

export default createNextConfig({
  pwa: true,
  extend: {
    eslint: {
      ignoreDuringBuilds: true
    }
  }
})