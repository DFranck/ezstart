import type { Metadata } from 'next'
import { getCanonicalUrl, type AppName } from '@ezstart/config/urls'

export type MetadataConfig =
  | {
      /** App name - auto-detects canonical URL from @ezstart/config */
      app: AppName
      appName: string
      description: string
      keywords?: string[]
      themeColor?: string
      ogImage?: string
      twitterHandle?: string
      locale?: string
      /** Custom icons (overrides default favicon detection) */
      icons?: {
        icon?: string | Array<{ url: string; sizes?: string; type?: string }>
        apple?: string | Array<{ url: string; sizes?: string; type?: string }>
        shortcut?: string
      }
    }
  | {
      /** Manual domain (fallback for custom configs) */
      domain: string
      appName: string
      description: string
      keywords?: string[]
      themeColor?: string
      ogImage?: string
      twitterHandle?: string
      locale?: string
      /** Custom icons (overrides default favicon detection) */
      icons?: {
        icon?: string | Array<{ url: string; sizes?: string; type?: string }>
        apple?: string | Array<{ url: string; sizes?: string; type?: string }>
        shortcut?: string
      }
    }

/**
 * Crée une metadata Next.js complète avec Open Graph et Twitter Cards
 *
 * @example
 * ```ts
 * // apps/ezbill/web/src/app/layout.tsx
 * import { createMetadata } from '@ezstart/seo-config/metadata'
 *
 * export const metadata = createMetadata({
 *   app: 'ezbill',  // Auto-detects https://ezbill.ezstart.xyz
 *   appName: 'EZBill',
 *   description: 'Professional invoicing and billing',
 *   keywords: ['invoicing', 'billing', 'business']
 * })
 *
 * // Or with manual domain (fallback)
 * export const metadata = createMetadata({
 *   domain: 'https://myapp.vercel.app',
 *   appName: 'MyApp',
 *   description: 'App description',
 *   keywords: ['app']
 * })
 * ```
 */
export function createMetadata(config: MetadataConfig): Metadata {
  // Auto-detect domain from app name or use manual domain
  const domain = 'app' in config ? getCanonicalUrl(config.app, 'web') : config.domain
  const {
    appName,
    description,
    keywords = [],
    themeColor = '#000000',
    ogImage = `${domain}/og-image.png`,
    twitterHandle = '@ezstart',
    locale = 'en_US',
    icons,
  } = config

  return {
    title: {
      default: appName,
      template: `%s | ${appName}`,
    },
    description,
    keywords,
    authors: [{ name: 'EZStart Team' }],
    creator: 'EZStart',
    publisher: 'EZStart',
    metadataBase: new URL(domain),
    alternates: {
      canonical: '/',
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
      title: appName,
      description,
      url: domain,
      siteName: appName,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: appName,
        },
      ],
      locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: appName,
      description,
      images: [ogImage],
      creator: twitterHandle,
    },
    manifest: '/manifest.json',
    ...(icons && { icons }), // Add icons if provided
  }
}

/**
 * Creates viewport configuration for Next.js (separate from metadata in Next.js 15+)
 * Should be exported as `export const viewport` in layout.tsx
 *
 * @example
 * ```ts
 * // apps/myapp/web/src/app/layout.tsx
 * import { createViewport } from '@ezstart/seo-config/metadata'
 *
 * export const viewport = createViewport('#3B82F6')
 * ```
 */
export function createViewport(themeColor = '#000000') {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor,
  }
}

export default createMetadata
