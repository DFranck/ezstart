import type { MetadataRoute } from 'next'

export interface RobotsConfig {
  domain: string
  disallow?: string[]
  additionalRules?: MetadataRoute.Robots['rules']
}

/**
 * Crée un robots.txt standardisé pour les apps @ezstart
 *
 * @example
 * ```ts
 * // apps/myapp/web/src/app/robots.ts
 * import { createRobots } from '@ezstart/seo-config/robots'
 *
 * export default function robots() {
 *   return createRobots({
 *     domain: 'https://myapp.vercel.app'
 *   })
 * }
 * ```
 */
export function createRobots(config: RobotsConfig): MetadataRoute.Robots {
  const { domain, disallow = ['/api/', '/admin/'], additionalRules } = config

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
