import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    domain: 'https://fengshui-web.vercel.app',
    routes: ['/'],
  })
}
