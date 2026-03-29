/**
 * Enhanced Metadata Generator
 *
 * Uses rich SEO data from apps/ configs to generate comprehensive Next.js metadata
 * including Open Graph, Twitter Cards, Schema.org, and more.
 */

import type { Metadata } from 'next'
import { getCanonicalUrl, type AppName } from '@ezstart/config/urls'
import { getAppSEO, type AppSEOKey } from './apps'
import type { AppSEOConfig } from './apps/ezstart'
import type { BrandConfig } from './metadata'

/** Organization info for Schema.org generation */
export interface OrganizationConfig {
  /** Organization name */
  name: string
  /** Contact email */
  contactEmail?: string
  /** Founding date (e.g., '2024') */
  foundingDate?: string
  /** Social media / external profile URLs */
  sameAs?: string[]
}

/** Software schema config for Schema.org SoftwareApplication */
export interface SoftwareSchemaConfig {
  /** Application category (default: 'WebApplication') */
  applicationCategory?: string
  /** Price (default: '0') */
  price?: string
  /** Currency (default: 'USD') */
  priceCurrency?: string
  /** Aggregate rating - only include if you have real data */
  aggregateRating?: {
    ratingValue: string
    ratingCount: string
    bestRating?: string
    worstRating?: string
  }
  /** Software version */
  softwareVersion?: string
  /** Date published (ISO format) */
  datePublished?: string
  /** Author organization */
  author?: {
    name: string
    url: string
  }
}

export interface EnhancedMetadataConfig {
  /** App name - auto-detects canonical URL and loads SEO config */
  app: AppName & AppSEOKey
  /** Page-specific title (optional, defaults to app tagline) */
  pageTitle?: string
  /** Page-specific description (optional, defaults to short description) */
  pageDescription?: string
  /** Page path for canonical URL (e.g., '/about', '/pricing') */
  pagePath?: string
  /** Custom OG image (optional, defaults to /og-image.png) */
  ogImage?: string
  /** Override theme color */
  themeColor?: string
  /** Override locale */
  locale?: string
  /** Include FAQ Schema.org (default: false) */
  includeFAQSchema?: boolean
  /** Include Organization Schema.org (default: false) */
  includeOrgSchema?: boolean
  /** Branding overrides (author, creator, twitter handle) */
  brand?: BrandConfig
  /** Category for metadata (default: 'Technology') */
  category?: string
}

/** Config for generating enhanced metadata from custom data (no app registry lookup) */
export interface CustomEnhancedMetadataConfig {
  /** SEO data to use directly (instead of looking up from app registry) */
  seoData: AppSEOConfig
  /** Base domain URL */
  domain: string
  /** Page-specific title */
  pageTitle?: string
  /** Page-specific description */
  pageDescription?: string
  /** Page path for canonical URL */
  pagePath?: string
  /** Custom OG image */
  ogImage?: string
  /** Override locale */
  locale?: string
  /** Branding overrides */
  brand?: BrandConfig
  /** Category for metadata */
  category?: string
}

/**
 * Creates enhanced Next.js metadata using rich SEO data
 *
 * @example
 * ```ts
 * // apps/ezstart/web/src/app/layout.tsx
 * import { createEnhancedMetadata } from '@ezstart/seo-config/metadata-enhanced'
 *
 * export const metadata = createEnhancedMetadata({
 *   app: 'ezstart',
 *   includeFAQSchema: true,
 *   includeOrgSchema: true,
 * })
 *
 * // For a specific page
 * // apps/ezstart/web/src/app/about/page.tsx
 * export const metadata = createEnhancedMetadata({
 *   app: 'ezstart',
 *   pageTitle: 'About Us',
 *   pageDescription: 'Learn about EZStart and our mission',
 *   pagePath: '/about',
 * })
 * ```
 */
export function createEnhancedMetadata(config: EnhancedMetadataConfig): Metadata {
  const seoData = getAppSEO(config.app)
  const domain = getCanonicalUrl(config.app, 'web')

  return buildEnhancedMetadata({
    seoData,
    domain,
    pageTitle: config.pageTitle,
    pageDescription: config.pageDescription,
    pagePath: config.pagePath,
    ogImage: config.ogImage,
    locale: config.locale,
    brand: config.brand,
    category: config.category,
  })
}

/**
 * Creates enhanced metadata from custom SEO data (no app registry lookup)
 *
 * @example
 * ```ts
 * import { createCustomEnhancedMetadata } from '@ezstart/seo-config/metadata-enhanced'
 *
 * export const metadata = createCustomEnhancedMetadata({
 *   seoData: myAppSEOConfig,
 *   domain: 'https://myapp.com',
 *   brand: { author: 'My Team', twitterHandle: '@myapp' },
 * })
 * ```
 */
export function createCustomEnhancedMetadata(config: CustomEnhancedMetadataConfig): Metadata {
  return buildEnhancedMetadata(config)
}

/** Internal shared implementation for enhanced metadata */
function buildEnhancedMetadata(config: {
  seoData: AppSEOConfig
  domain: string
  pageTitle?: string
  pageDescription?: string
  pagePath?: string
  ogImage?: string
  locale?: string
  brand?: BrandConfig
  category?: string
}): Metadata {
  const { seoData, domain, brand } = config
  const canonicalUrl = config.pagePath ? `${domain}${config.pagePath}` : domain

  // Use page-specific or default from SEO data
  const title = config.pageTitle || seoData.tagline
  const description = config.pageDescription || seoData.shortDescription
  const ogImage = config.ogImage || `${domain}/og-image.png`
  const locale = config.locale || 'en_US'

  // Resolve branding — defaults to app name, no hardcoded org
  const resolvedAuthor = brand?.author ?? seoData.appName
  const resolvedCreator = brand?.creator ?? seoData.appName
  const resolvedPublisher = brand?.publisher ?? seoData.appName
  const resolvedTwitter = brand?.twitterHandle

  // Extract all keywords for metadata
  const allKeywords = [
    ...seoData.keywords.primary.map(k => k.term),
    ...seoData.keywords.secondary.map(k => k.term),
    ...seoData.keywords.longTail.slice(0, 5).map(k => k.term), // Top 5 long-tail
  ]

  const metadata: Metadata = {
    title: config.pageTitle
      ? {
          default: config.pageTitle,
          template: `%s | ${seoData.appName}`,
        }
      : {
          default: seoData.appName,
          template: `%s | ${seoData.appName}`,
        },
    description,
    keywords: allKeywords,
    authors: [{ name: resolvedAuthor }],
    creator: resolvedCreator,
    publisher: resolvedPublisher,
    metadataBase: new URL(domain),
    alternates: {
      canonical: config.pagePath || '/',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      url: canonicalUrl,
      title: config.pageTitle || seoData.appName,
      description,
      siteName: seoData.appName,
      locale,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${seoData.appName} - ${seoData.tagline}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      ...(resolvedTwitter && { site: resolvedTwitter, creator: resolvedTwitter }),
      title: config.pageTitle || seoData.appName,
      description,
      images: [ogImage],
    },
    manifest: '/manifest.json',
    // Add app-specific metadata
    applicationName: seoData.appName,
    category: config.category ?? 'Technology',
  }

  return metadata
}

/**
 * Creates viewport configuration (Next.js 15+)
 *
 * @example
 * ```ts
 * import { createEnhancedViewport } from '@ezstart/seo-config/metadata-enhanced'
 *
 * export const viewport = createEnhancedViewport('#3B82F6')
 * ```
 */
export function createEnhancedViewport(themeColor = '#000000') {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor,
  }
}

/**
 * Generate Schema.org FAQ structured data
 *
 * @example
 * ```tsx
 * import { generateFAQSchema } from '@ezstart/seo-config/metadata-enhanced'
 *
 * export default function Page() {
 *   const faqSchema = generateFAQSchema('ezstart')
 *
 *   return (
 *     <>
 *       <script
 *         type="application/ld+json"
 *         dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
 *       />
 *       <YourPageContent />
 *     </>
 *   )
 * }
 * ```
 */
export function generateFAQSchema(appKeyOrFaq: AppSEOKey | { question: string; answer: string }[]) {
  const faq = Array.isArray(appKeyOrFaq) ? appKeyOrFaq : getAppSEO(appKeyOrFaq).faq

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

/**
 * Generate Schema.org Organization structured data
 *
 * @example
 * ```tsx
 * import { generateOrganizationSchema } from '@ezstart/seo-config/metadata-enhanced'
 *
 * export default function RootLayout() {
 *   const orgSchema = generateOrganizationSchema('ezstart')
 *
 *   return (
 *     <html>
 *       <head>
 *         <script
 *           type="application/ld+json"
 *           dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
 *         />
 *       </head>
 *       <body>...</body>
 *     </html>
 *   )
 * }
 * ```
 */
export function generateOrganizationSchema(
  appKeyOrConfig:
    | AppSEOKey
    | (OrganizationConfig & { description?: string; url?: string; logoUrl?: string })
) {
  // App registry lookup
  if (typeof appKeyOrConfig === 'string') {
    const seoData = getAppSEO(appKeyOrConfig)
    const domain = getCanonicalUrl(appKeyOrConfig as AppName, 'web')

    return buildOrgSchema({
      name: seoData.appName,
      url: domain,
      logoUrl: `${domain}/logo.png`,
      description: seoData.shortDescription,
    })
  }

  // Direct config
  return buildOrgSchema(appKeyOrConfig)
}

function buildOrgSchema(config: {
  name: string
  url?: string
  logoUrl?: string
  description?: string
  contactEmail?: string
  foundingDate?: string
  sameAs?: string[]
}) {
  return {
    '@context': 'https://schema.org' as const,
    '@type': 'Organization' as const,
    name: config.name,
    ...(config.url && { url: config.url }),
    ...(config.logoUrl && { logo: config.logoUrl }),
    ...(config.description && { description: config.description }),
    ...(config.foundingDate && { foundingDate: config.foundingDate }),
    ...(config.contactEmail && {
      contactPoint: {
        '@type': 'ContactPoint' as const,
        contactType: 'Customer Support',
        email: config.contactEmail,
      },
    }),
    ...(config.sameAs && config.sameAs.length > 0 && { sameAs: config.sameAs }),
  }
}

/**
 * Generate Schema.org SoftwareApplication structured data
 *
 * @example
 * ```tsx
 * import { generateSoftwareSchema } from '@ezstart/seo-config/metadata-enhanced'
 *
 * export default function Page() {
 *   const softwareSchema = generateSoftwareSchema('ezstart')
 *
 *   return (
 *     <>
 *       <script
 *         type="application/ld+json"
 *         dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
 *       />
 *       <YourPageContent />
 *     </>
 *   )
 * }
 * ```
 */
export function generateSoftwareSchema(
  appKeyOrConfig:
    | AppSEOKey
    | { seoData: AppSEOConfig; domain: string; software?: SoftwareSchemaConfig },
  softwareConfig?: SoftwareSchemaConfig
) {
  let seoData: AppSEOConfig
  let domain: string
  let software: SoftwareSchemaConfig | undefined

  if (typeof appKeyOrConfig === 'string') {
    seoData = getAppSEO(appKeyOrConfig)
    domain = getCanonicalUrl(appKeyOrConfig as AppName, 'web')
    software = softwareConfig
  } else {
    seoData = appKeyOrConfig.seoData
    domain = appKeyOrConfig.domain
    software = appKeyOrConfig.software
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: seoData.appName,
    applicationCategory: software?.applicationCategory ?? 'WebApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: software?.price ?? '0',
      priceCurrency: software?.priceCurrency ?? 'USD',
    },
    // Only include rating if explicitly provided with real data
    ...(software?.aggregateRating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: software.aggregateRating.ratingValue,
        ratingCount: software.aggregateRating.ratingCount,
        bestRating: software.aggregateRating.bestRating ?? '5',
        worstRating: software.aggregateRating.worstRating ?? '1',
      },
    }),
    description: seoData.longDescription,
    url: domain,
    screenshot: `${domain}/screenshot.png`,
    ...(software?.softwareVersion && { softwareVersion: software.softwareVersion }),
    ...(software?.datePublished && { datePublished: software.datePublished }),
    ...(software?.author && {
      author: {
        '@type': 'Organization',
        name: software.author.name,
        url: software.author.url,
      },
    }),
  }
}

/**
 * Generate comprehensive metadata for landing pages
 * Includes all Schema.org types and enhanced metadata
 *
 * @example
 * ```tsx
 * // apps/ezstart/web/src/app/landing-v2/page.tsx
 * import { generateLandingMetadata } from '@ezstart/seo-config/metadata-enhanced'
 *
 * export const metadata = generateLandingMetadata('ezstart')
 *
 * export default function LandingV2() {
 *   return <LandingPageContent />
 * }
 * ```
 */
export function generateLandingMetadata(
  appKeyOrConfig:
    | AppSEOKey
    | {
        seoData: AppSEOConfig
        domain: string
        brand?: BrandConfig
        pagePath?: string
        category?: string
      }
): Metadata {
  let seoData: AppSEOConfig
  let domain: string
  let brand: BrandConfig | undefined
  let pagePath: string
  let category: string

  if (typeof appKeyOrConfig === 'string') {
    seoData = getAppSEO(appKeyOrConfig)
    domain = getCanonicalUrl(appKeyOrConfig as AppName, 'web')
    brand = undefined
    pagePath = '/landing-v2'
    category = 'Technology'
  } else {
    seoData = appKeyOrConfig.seoData
    domain = appKeyOrConfig.domain
    brand = appKeyOrConfig.brand
    pagePath = appKeyOrConfig.pagePath ?? '/'
    category = appKeyOrConfig.category ?? 'Technology'
  }

  // Resolve branding
  const resolvedAuthor = brand?.author ?? seoData.appName
  const resolvedCreator = brand?.creator ?? seoData.appName
  const resolvedPublisher = brand?.publisher ?? seoData.appName
  const resolvedTwitter = brand?.twitterHandle

  // Use long description for landing pages
  const description = seoData.longDescription

  // Extract all keywords with priority
  const allKeywords = [
    ...seoData.keywords.primary.map(k => k.term),
    ...seoData.keywords.secondary.map(k => k.term),
    ...seoData.keywords.longTail.map(k => k.term),
  ]

  return {
    title: {
      default: `${seoData.appName} - ${seoData.tagline}`,
      template: `%s | ${seoData.appName}`,
    },
    description,
    keywords: allKeywords,
    authors: [{ name: resolvedAuthor }],
    creator: resolvedCreator,
    publisher: resolvedPublisher,
    metadataBase: new URL(domain),
    alternates: {
      canonical: pagePath,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      url: `${domain}${pagePath}`,
      title: `${seoData.appName} - ${seoData.tagline}`,
      description,
      siteName: seoData.appName,
      locale: 'en_US',
      images: [
        {
          url: `${domain}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${seoData.appName} - ${seoData.tagline}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      ...(resolvedTwitter && { site: resolvedTwitter, creator: resolvedTwitter }),
      title: `${seoData.appName} - ${seoData.tagline}`,
      description,
      images: [`${domain}/og-image.png`],
    },
    manifest: '/manifest.json',
    applicationName: seoData.appName,
    category,
    // Additional metadata for landing pages
    other: {
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
    },
  }
}

export default createEnhancedMetadata
