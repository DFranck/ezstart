import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'asc-tcd',
    routes: [
      '/',
      '/quote',
      '/transplantation-d-arbres',
      '/legal-notices',
    ],
  })
}
