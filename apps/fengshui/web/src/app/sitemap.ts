import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'fengshui',
    routes: [
      '/',
      '/analyze',
      '/donate',
      '/donate/success',
      '/donate/cancel',
    ],
  })
}
