import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'game-analyzer',
    routes: [
      '/',
      '/scan',
      '/history',
    ],
  })
}
