import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    app: 'ezstart',
    routes: [
      // Main pages
      '/',

      // Features
      '/ez-features',
      '/ez-features/business-card',
      '/ez-features/cv-generator',
      '/ez-features/qr-code',

      // Libraries
      '/ez-libs',
      '/ez-libs/tag',
      '/ez-libs/icon',

      // Other
      '/legal-notices',
      '/monitoring',
    ],
  })
}
