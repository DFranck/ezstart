import createNextIntlPlugin from 'next-intl/plugin'

/**
 * Helper pour ajouter next-intl à la config Next.js
 * @param {import('next').NextConfig} config - Config Next.js de base
 * @returns {import('next').NextConfig} - Config avec i18n
 */
export function withI18n(config = {}) {
  const withNextIntl = createNextIntlPlugin('./src/i18n.ts')
  return withNextIntl(config)
}

export default withI18n
