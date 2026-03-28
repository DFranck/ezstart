import type { MetadataRoute } from 'next'
import { getCanonicalUrl, type AppName } from '@ezstart/config/urls'

export type RobotsConfig =
  | {
      /** App name - auto-detects canonical URL from @ezstart/config */
      app: AppName
      disallow?: string[]
      additionalRules?: MetadataRoute.Robots['rules']
    }
  | {
      /** Manual domain (fallback for custom configs) */
      domain: string
      disallow?: string[]
      additionalRules?: MetadataRoute.Robots['rules']
    }

/**
 * Crée un robots.txt standardisé pour les apps @ezstart
 *
 * @example
 * ```ts
 * // apps/ezbill/web/src/app/robots.ts
 * import { createRobots } from '@ezstart/seo-config/robots'
 *
 * export default function robots() {
 *   return createRobots({
 *     app: 'ezbill'  // Auto-detects https://ezbill.ezstart.xyz
 *   })
 * }
 *
 * // Or with manual domain (fallback)
 * export default function robots() {
 *   return createRobots({
 *     domain: 'https://myapp.vercel.app'
 *   })
 * }
 * ```
 */
export function createRobots(config: RobotsConfig): MetadataRoute.Robots {
  // Auto-detect domain from app name or use manual domain
  const domain = 'app' in config ? getCanonicalUrl(config.app, 'web') : config.domain
  const { disallow = ['/api/', '/admin/'], additionalRules } = config

  return {
    rules: additionalRules || {
      userAgent: '*',
      allow: '/',
      disallow,
    },
    sitemap: `${domain}/sitemap.xml`,
  }
}

export default createRobots
