/**
 * GreenPulse Landing V2 Layout - Server Component with Metadata
 *
 * Generates metadata and structured data for SEO
 */

import { generateLandingMetadata, generateFAQSchema, generateSoftwareSchema } from '@ezstart/seo-config'

// Generate metadata for this page (Server Component only)
export const metadata = generateLandingMetadata('green-pulse')

export default function LandingV2Layout({ children }: { children: React.ReactNode }) {
  // Generate Schema.org structured data
  const faqSchema = generateFAQSchema('green-pulse')
  const softwareSchema = generateSoftwareSchema('green-pulse')

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      {children}
    </>
  )
}
