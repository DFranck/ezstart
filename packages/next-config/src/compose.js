import path from 'path'
import deepmerge from 'deepmerge'
import { baseConfig } from './base.js'
import { withI18n } from './withI18n.js'
import { withPWA } from './withPWA.js'
import { loadSharedEnv } from './withSharedEnv.js'
import withBundleAnalyzer from './with-bundle-analyzer.js'

/**
 * Auto-detect the app name from the current working directory.
 * Each web app's next.config.js runs from `apps/<app>/web/`, so we look
 * for `apps/<X>/web` in the cwd path and return `<X>`.
 *
 * @returns {string | undefined}
 */
function detectAppFromCwd() {
  const cwd = process.cwd().split(path.sep)
  // Find ".../apps/<app>/web" pattern
  for (let i = cwd.length - 1; i >= 2; i--) {
    if (cwd[i] === 'web' && cwd[i - 2] === 'apps') {
      return cwd[i - 1]
    }
  }
  return undefined
}

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

  // 🔐 Load env in two layers (root shared + per-app overrides).
  // App name auto-detected from cwd if not provided. Next.js will also
  // re-load `apps/<app>/web/.env.local` natively, but we run first so
  // values are present in process.env before next.config.js reads them.
  const resolvedApp = app ?? detectAppFromCwd()
  loadSharedEnv(resolvedApp)

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
