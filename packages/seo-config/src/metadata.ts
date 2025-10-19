import type { Metadata } from 'next'

export interface MetadataConfig {
  appName: string
  description: string
  domain: string
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
 * // apps/myapp/web/src/app/layout.tsx
 * import { createMetadata } from '@ezstart/seo-config/metadata'
 *
 * export const metadata = createMetadata({
 *   appName: 'EZAuth',
 *   description: 'Centralized authentication service',
 *   domain: 'https://ezauth.vercel.app',
 *   keywords: ['auth', 'SSO', 'OAuth2']
 * })
 * ```
 */
export function createMetadata(config: MetadataConfig): Metadata {
  const {
    appName,
    description,
    domain,
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
    themeColor,
    viewport: {
      width: 'device-width',
      initialScale: 1,
      maximumScale: 5,
    },
    ...(icons && { icons }), // Add icons if provided
  }
}

export default createMetadata
