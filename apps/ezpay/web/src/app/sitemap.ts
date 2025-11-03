import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'ezpay',
    routes: ['/'],
  })
}
