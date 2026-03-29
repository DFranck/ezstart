export { createMetadata } from './metadata'
export type { MetadataConfig, BrandConfig } from './metadata'

export { createRobots } from './robots'
export type { RobotsConfig } from './robots'

export { createSitemap } from './sitemap'
export type { SitemapConfig } from './sitemap'

export { createJsonLd, createOrganizationJsonLd } from './json-ld'
export type { JsonLdConfig } from './json-ld'

// Enhanced SEO configs for all apps (defaults for @ezstart monorepo)
export * from './apps'

// Re-export the AppSEOConfig type so consumers can build their own configs
export type { AppSEOConfig } from './apps/ezstart'

// Enhanced metadata generator using rich SEO data
export {
  createEnhancedMetadata,
  createCustomEnhancedMetadata,
  createEnhancedViewport,
  generateFAQSchema,
  generateOrganizationSchema,
  generateSoftwareSchema,
  generateLandingMetadata,
} from './metadata-enhanced'
export type {
  EnhancedMetadataConfig,
  CustomEnhancedMetadataConfig,
  OrganizationConfig,
  SoftwareSchemaConfig,
} from './metadata-enhanced'
