import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'green-pulse',
    routes: [
      '/',
      '/chat', // Public AI chat interface
    ],
  })
}
