import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    domain: 'https://ezbill-web.vercel.app',
    routes: ['/'],
  })
}
