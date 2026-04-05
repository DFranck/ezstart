import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'ezstart',
    routes: [
      // Main pages
      '/',

      // Tools
      '/tools',
      '/tools/business-card',
      '/tools/cv-generator',
      '/tools/qr-code',

      // Packages
      '/packages',
      '/packages/tag',
      '/packages/icon',

      // Other
      '/legal-notices',
      '/monitoring',
    ],
  })
}
