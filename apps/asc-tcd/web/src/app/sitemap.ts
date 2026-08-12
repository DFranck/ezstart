import { getAllArticleSlugs } from '@/lib/articles'
import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  const articleRoutes = getAllArticleSlugs().map(slug => `/articles/${slug}`)

  return createSitemap({
    app: 'asc-tcd',
    routes: [
      '/',
      '/quote',
      '/transplantation-d-arbres',
      '/articles',
      ...articleRoutes,
      '/legal-notices',
    ],
  })
}
