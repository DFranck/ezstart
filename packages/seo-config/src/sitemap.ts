import type { MetadataRoute } from 'next'

export interface SitemapConfig {
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
 * // apps/myapp/web/src/app/sitemap.ts
 * import { createSitemap } from '@ezstart/seo-config/sitemap'
 *
 * export default function sitemap() {
 *   return createSitemap({
 *     domain: 'https://myapp.vercel.app',
 *     routes: ['/', '/about', '/contact']
 *   })
 * }
 * ```
 */
export function createSitemap(config: SitemapConfig): MetadataRoute.Sitemap {
  const {
    domain,
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
