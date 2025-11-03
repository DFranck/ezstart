import type { MetadataRoute } from 'next'
import { getCanonicalUrl, type AppName } from '@ezstart/config/urls'

export type SitemapConfig =
  | {
      /** App name - auto-detects canonical URL from @ezstart/config */
      app: AppName
      routes: string[]
      changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
      priority?: number
      lastModified?: Date
    }
  | {
      /** Manual domain (fallback for custom configs) */
      domain: string
      routes: string[]
      changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
      priority?: number
      lastModified?: Date
    }

/**
 * Crée un sitemap.xml standardisé pour les apps @ezstart
 *
 * @example
 * ```ts
 * // apps/ezbill/web/src/app/sitemap.ts
 * import { createSitemap } from '@ezstart/seo-config/sitemap'
 *
 * export default function sitemap() {
 *   return createSitemap({
 *     app: 'ezbill',  // Auto-detects https://ezbill.ezstart.xyz
 *     routes: ['/', '/about', '/contact']
 *   })
 * }
 *
 * // Or with manual domain (fallback)
 * export default function sitemap() {
 *   return createSitemap({
 *     domain: 'https://myapp.vercel.app',
 *     routes: ['/', '/about']
 *   })
 * }
 * ```
 */
export function createSitemap(config: SitemapConfig): MetadataRoute.Sitemap {
  // Auto-detect domain from app name or use manual domain
  const domain = 'app' in config ? getCanonicalUrl(config.app, 'web') : config.domain
  const {
    routes,
    changeFrequency = 'weekly',
    priority: defaultPriority,
    lastModified = new Date(),
  } = config

  return routes.map((route) => ({
    url: `${domain}${route}`,
    lastModified,
    changeFrequency,
    priority: defaultPriority !== undefined ? defaultPriority : route === '/' ? 1 : 0.8,
  }))
}

export default createSitemap
