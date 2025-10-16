import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    domain: 'https://tower-defense-web.vercel.app',
    routes: ['/'],
  })
}
