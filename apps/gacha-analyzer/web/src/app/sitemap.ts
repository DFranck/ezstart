import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'gacha-analyzer',
    routes: [
      '/',
      '/scan',
      '/history',
    ],
  })
}
