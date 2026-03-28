export { createMetadata } from './metadata'
export type { MetadataConfig } from './metadata'

export { createRobots } from './robots'
export type { RobotsConfig } from './robots'

export { createSitemap } from './sitemap'
export type { SitemapConfig } from './sitemap'

export { createJsonLd, createOrganizationJsonLd } from './json-ld'
export type { JsonLdConfig } from './json-ld'

// Enhanced SEO configs for all apps
export * from './apps'

// Enhanced metadata generator using rich SEO data
export {
  createEnhancedMetadata,
  createEnhancedViewport,
  generateFAQSchema,
  generateOrganizationSchema,
  generateSoftwareSchema,
  generateLandingMetadata,
} from './metadata-enhanced'
export type { EnhancedMetadataConfig } from './metadata-enhanced'
