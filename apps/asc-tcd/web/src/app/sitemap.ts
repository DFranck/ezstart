import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    domain: 'https://asc-tcd-web.vercel.app',
    routes: ['/'],
  })
}
