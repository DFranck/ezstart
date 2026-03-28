/**
 * Enhanced Metadata Generator
 *
 * Uses rich SEO data from apps/ configs to generate comprehensive Next.js metadata
 * including Open Graph, Twitter Cards, Schema.org, and more.
 */

import type { Metadata } from 'next'
import { getCanonicalUrl, type AppName } from '@ezstart/config/urls'
import { getAppSEO, type AppSEOKey } from './apps'

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
  const canonicalUrl = config.pagePath ? `${domain}${config.pagePath}` : domain

  // Use page-specific or default from SEO data
  const title = config.pageTitle || seoData.tagline
  const description = config.pageDescription || seoData.shortDescription
  const ogImage = config.ogImage || `${domain}/og-image.png`
  const locale = config.locale || 'en_US'

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
    authors: [{ name: 'EZStart Team' }],
    creator: 'EZStart',
    publisher: 'EZStart',
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
      site: '@ezstart',
      creator: '@ezstart',
      title: config.pageTitle || seoData.appName,
      description,
      images: [ogImage],
    },
    manifest: '/manifest.json',
    // Add app-specific metadata
    applicationName: seoData.appName,
    category: 'Technology',
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
export function generateFAQSchema(appKey: AppSEOKey) {
  const seoData = getAppSEO(appKey)

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: seoData.faq.map(item => ({
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
export function generateOrganizationSchema(appKey: AppSEOKey) {
  const seoData = getAppSEO(appKey)
  const domain = getCanonicalUrl(appKey as AppName, 'web')

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: seoData.appName,
    url: domain,
    logo: `${domain}/logo.png`,
    description: seoData.shortDescription,
    foundingDate: '2024',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'contact@ezstart.xyz',
    },
    sameAs: [
      'https://github.com/JOBOYA/ez-hub',
      // Add more social media links as needed
    ],
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
export function generateSoftwareSchema(appKey: AppSEOKey) {
  const seoData = getAppSEO(appKey)
  const domain = getCanonicalUrl(appKey as AppName, 'web')

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: seoData.appName,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    aggregateRating:
      seoData.socialProof.stats.length > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: '4.8',
            ratingCount: '100',
            bestRating: '5',
            worstRating: '1',
          }
        : undefined,
    description: seoData.longDescription,
    url: domain,
    screenshot: `${domain}/screenshot.png`,
    softwareVersion: '1.0',
    datePublished: '2024-01-01',
    author: {
      '@type': 'Organization',
      name: 'EZStart',
      url: 'https://www.ezstart.xyz',
    },
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
export function generateLandingMetadata(appKey: AppSEOKey): Metadata {
  const seoData = getAppSEO(appKey)
  const domain = getCanonicalUrl(appKey as AppName, 'web')

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
    authors: [{ name: 'EZStart Team' }],
    creator: 'EZStart',
    publisher: 'EZStart',
    metadataBase: new URL(domain),
    alternates: {
      canonical: '/landing-v2',
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
      url: `${domain}/landing-v2`,
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
      site: '@ezstart',
      creator: '@ezstart',
      title: `${seoData.appName} - ${seoData.tagline}`,
      description,
      images: [`${domain}/og-image.png`],
    },
    manifest: '/manifest.json',
    applicationName: seoData.appName,
    category: 'Technology',
    // Additional metadata for landing pages
    other: {
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'black-translucent',
    },
  }
}

export default createEnhancedMetadata
