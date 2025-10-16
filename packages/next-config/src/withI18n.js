import createNextIntlPlugin from 'next-intl/plugin'

/**
 * Helper pour ajouter next-intl à la config Next.js
 * @param {import('next').NextConfig} config - Config Next.js de base
 * @param {string} [requestPath='./src/i18n/request.ts'] - Chemin du fichier i18n request
 * @returns {import('next').NextConfig} - Config avec i18n
 */
export function withI18n(config = {}, requestPath = './src/i18n/request.ts') {
  const withNextIntl = createNextIntlPlugin(requestPath)
  return withNextIntl(config)
}

export default withI18n
