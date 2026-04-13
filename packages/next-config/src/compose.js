import deepmerge from 'deepmerge'
import { baseConfig } from './base.js'
import { withI18n } from './withI18n.js'
import { withPWA } from './withPWA.js'
import { loadSharedEnv } from './withSharedEnv.js'
import withBundleAnalyzer from './with-bundle-analyzer.js'

/**
 * Crée une config Next.js composée avec options
 * @param {Object} options - Options de configuration
 * @param {boolean} [options.pwa=false] - Activer PWA
 * @param {boolean} [options.i18n=false] - Activer i18n
 * @param {string} [options.i18nRequestPath='./src/i18n/request.ts'] - Chemin du fichier i18n request
 * @param {Object} [options.pwaOptions={}] - Options PWA customisées
 * @param {import('next').NextConfig} [options.extend={}] - Config Next.js supplémentaire
 * @returns {import('next').NextConfig} - Config Next.js composée
 *
 * @example
 * // App simple
 * export default createNextConfig()
 *
 * @example
 * // App avec PWA
 * export default createNextConfig({ pwa: true })
 *
 * @example
 * // App avec i18n
 * export default createNextConfig({ i18n: true })
 *
 * @example
 * // App avec PWA + i18n + custom config
 * export default createNextConfig({
 *   pwa: true,
 *   i18n: true,
 *   extend: {
 *     transpilePackages: ['@ezstart/pay-sdk']
 *   }
 * })
 */
export function createNextConfig(options = {}) {
  const {
    pwa = false,
    i18n = false,
    i18nRequestPath = './src/i18n/request.ts',
    pwaOptions = {},
    extend = {},
    app,
  } = options

  // 🔐 Load monorepo-root shared env BEFORE Next.js reads anything.
  // App-local .env.local still loaded natively by Next and wins on conflict.
  loadSharedEnv(app)

  // Merge base config avec extensions custom
  let config = deepmerge(baseConfig, extend)

  // Appliquer i18n si demandé
  if (i18n) {
    // Mettre à jour le chemin dans withI18n temporairement
    const originalWithI18n = withI18n
    config = originalWithI18n(config, i18nRequestPath)
  }

  // Appliquer PWA si demandé
  if (pwa) {
    config = withPWA(config, pwaOptions)
  }

  // Toujours appliquer bundle analyzer (activé seulement si ANALYZE=true)
  config = withBundleAnalyzer(config)

  return config
}

export default createNextConfig
