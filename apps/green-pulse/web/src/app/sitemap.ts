import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    domain: 'https://green-pulse-web.vercel.app',
    routes: ['/'],
  })
}
