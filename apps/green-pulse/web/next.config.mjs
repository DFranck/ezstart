import createNextIntlPlugin from 'next-intl/plugin'
import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const baseConfig = {
  transpilePackages: ['@ezstart/ui', '@ezstart/auth-sdk', '@ezstart/next-theme'],
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

export default withNextIntl(pwaConfig(baseConfig))
