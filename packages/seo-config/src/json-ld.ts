import type { Thing, WebApplication, WithContext } from 'schema-dts'
import { getCanonicalUrl, type AppName } from '@ezstart/config/urls'

export type JsonLdConfig =
  | {
      /** App name - auto-detects canonical URL from @ezstart/config */
      app: AppName
      appName: string
      description: string
      applicationCategory?: string
      operatingSystem?: string
      offers?: {
        price: string
        priceCurrency: string
      }
      author?: {
        name: string
        url?: string
      }
      aggregateRating?: {
        ratingValue: number
        ratingCount: number
      }
    }
  | {
      /** Manual URL (fallback for custom configs) */
      url: string
      appName: string
      description: string
      applicationCategory?: string
      operatingSystem?: string
      offers?: {
        price: string
        priceCurrency: string
      }
      author?: {
        name: string
        url?: string
      }
      aggregateRating?: {
        ratingValue: number
        ratingCount: number
      }
    }

/**
 * Crée un JSON-LD WebApplication schema pour rich snippets Google
 *
 * @example
 * ```tsx
 * // app/layout.tsx
 * import { createJsonLd } from '@ezstart/seo-config/json-ld'
 *
 * const jsonLd = createJsonLd({
 *   app: 'ezauth',  // Auto-detects https://ezauth.ezstart.xyz
 *   appName: 'EZAuth',
 *   description: 'Centralized authentication service',
 *   applicationCategory: 'BusinessApplication',
 * })
 *
 * export default function Layout() {
 *   return (
 *     <html>
 *       <body>
 *         <script
 *           type="application/ld+json"
 *           dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
 *         />
 *         {children}
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 */
export function createJsonLd(config: JsonLdConfig): WithContext<WebApplication> {
  // Auto-detect URL from app name or use manual URL
  const url = 'app' in config ? getCanonicalUrl(config.app, 'web') : config.url
  const {
    appName,
    description,
    applicationCategory = 'WebApplication',
    operatingSystem = 'Any',
    offers = {
      price: '0',
      priceCurrency: 'USD',
    },
    author = {
      name: 'EZStart Team',
      url: 'https://www.ezstart.xyz',
    },
    aggregateRating,
  } = config

  const jsonLd: WithContext<WebApplication> = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: appName,
    description,
    url,
    applicationCategory,
    operatingSystem,
    offers: {
      '@type': 'Offer',
      price: offers.price,
      priceCurrency: offers.priceCurrency,
    },
    author: {
      '@type': 'Organization',
      name: author.name,
      ...(author.url && { url: author.url }),
    },
  }

  if (aggregateRating) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: aggregateRating.ratingValue,
      ratingCount: aggregateRating.ratingCount,
    }
  }

  return jsonLd
}

/**
 * Crée un JSON-LD Organization schema
 *
 * @example
 * ```tsx
 * const orgJsonLd = createOrganizationJsonLd({
 *   name: 'EZStart',
 *   url: 'https://ezstart-web.vercel.app',
 *   logo: 'https://ezstart-web.vercel.app/logo.png',
 *   description: 'Modern web development platform',
 * })
 * ```
 */
export function createOrganizationJsonLd(config: {
  name: string
  url: string
  logo?: string
  description?: string
  sameAs?: string[]
}): WithContext<Thing> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: config.name,
    url: config.url,
    ...(config.logo && { logo: config.logo }),
    ...(config.description && { description: config.description }),
    ...(config.sameAs && { sameAs: config.sameAs }),
  }
}
