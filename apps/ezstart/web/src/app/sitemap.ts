import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    domain: 'https://ezstart-web.vercel.app',
    routes: ['/'],
  })
}
