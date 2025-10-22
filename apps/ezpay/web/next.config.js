import { createNextConfig } from '@ezstart/next-config/compose'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n.ts')

export default withNextIntl(
  createNextConfig({
    pwa: true,
    extend: {
      transpilePackages: ['@ezstart/pay-sdk', '@ezstart/next-theme'],
      eslint: {
        ignoreDuringBuilds: true,
      },
    },
  })
)
