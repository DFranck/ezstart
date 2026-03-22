# 📊 @ezstart/seo-config - Enhanced SEO Documentation

**Centralized SEO configuration with rich app-specific data, enhanced metadata generation, and Schema.org structured data.**

---

## 🎯 What's New - Enhanced SEO Features

### Phase 1.2: Rich SEO Configs ✅

Complete SEO data for all 8 apps extracted from comprehensive documentation:

- ✅ Mission & Vision (What/Why/How framework)
- ✅ 3-5 Killer Features with detailed descriptions
- ✅ 3-4 Target Audience personas with pain points/goals
- ✅ Real-world use cases with before/after metrics
- ✅ Keywords with search volumes (primary, secondary, long-tail)
- ✅ USPs and competitive advantages
- ✅ Visual asset specifications (videos, GIFs, screenshots)
- ✅ FAQ items for Schema.org structured data
- ✅ Social proof stats
- ✅ Brand voice guidelines

### Phase 1.3: Enhanced Metadata Generator ✅

New `createEnhancedMetadata()` function that uses rich SEO data:

- ✅ Automatic keyword extraction from SEO configs
- ✅ Schema.org FAQ, Organization, SoftwareApplication
- ✅ Enhanced Open Graph with detailed descriptions
- ✅ Twitter Cards optimization
- ✅ Landing page-specific metadata generator
- ✅ Type-safe access to all SEO data

---

## 📦 Installation

```bash
pnpm add @ezstart/seo-config
```

---

## 🚀 Quick Start

### Option 1: Enhanced Metadata (Recommended for Landing Pages)

```tsx
// apps/ezstart/web/src/app/layout.tsx
import { createEnhancedMetadata, generateFAQSchema } from '@ezstart/seo-config'

export const metadata = createEnhancedMetadata({
  app: 'ezstart',
  includeFAQSchema: true,
  includeOrgSchema: true,
})

export default function RootLayout({ children }) {
  const faqSchema = generateFAQSchema('ezstart')

  return (
    <html>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Option 2: Basic Metadata (Simple Apps)

```tsx
// apps/myapp/web/src/app/layout.tsx
import { createMetadata } from '@ezstart/seo-config'

export const metadata = createMetadata({
  app: 'myapp',
  appName: 'MyApp',
  description: 'Simple app description',
  keywords: ['app', 'simple'],
})
```

---

## 📚 Enhanced API Reference

### 1. Rich SEO Data Access

#### `getAppSEO(appKey)`

Get complete SEO data for an app.

```tsx
import { getAppSEO } from '@ezstart/seo-config'

const seoData = getAppSEO('ezstart')

// Access comprehensive data
console.log(seoData.appName) // "EZStart"
console.log(seoData.tagline) // "Build and Launch SaaS Apps 10x Faster"
console.log(seoData.features) // Array of 5 detailed features
console.log(seoData.keywords.primary) // [{ term: 'web development platform', volume: 2400 }, ...]
console.log(seoData.targetAudience) // Array of 4 audience personas
console.log(seoData.useCases) // Array of real-world use cases
console.log(seoData.faq) // Array of FAQ items for Schema.org
```

**Available Data:**

```ts
interface AppSEOConfig {
  appName: string
  tagline: string
  shortDescription: string
  longDescription: string // 300-word SEO-optimized
  mission: {
    what: string
    why: string
    how: string
  }
  features: Feature[] // 3-5 killer features
  targetAudience: TargetAudience[] // 3-4 personas
  useCases: UseCase[] // Real-world examples with metrics
  keywords: {
    primary: { term: string; volume: number }[]
    secondary: { term: string; volume: number }[]
    longTail: { term: string; volume: number }[]
  }
  usps: {
    title: string
    description: string
    differentiators: string[]
  }
  vsCompetition: {
    category: string
    competitors: string[]
    ourAdvantage: string
  }[]
  visualAssets: VisualAsset[] // Specs for videos, GIFs, screenshots
  callToAction: {
    primary: string
    secondary: string
    url: string
  }
  socialProof: {
    stats: { label: string; value: string }[]
  }
  faq: { question: string; answer: string }[]
  brandVoice: {
    tone: string[]
    avoid: string[]
  }
}
```

---

### 2. Enhanced Metadata Generation

#### `createEnhancedMetadata(config)`

Creates comprehensive Next.js metadata using rich SEO data.

```tsx
import { createEnhancedMetadata } from '@ezstart/seo-config'

// Root layout metadata
export const metadata = createEnhancedMetadata({
  app: 'ezstart',
})

// Page-specific metadata
// apps/ezstart/web/src/app/features/page.tsx
export const metadata = createEnhancedMetadata({
  app: 'ezstart',
  pageTitle: 'Features',
  pageDescription: 'Discover EZStart features',
  pagePath: '/features',
})
```

**Config:**

```ts
interface EnhancedMetadataConfig {
  app: AppName & AppSEOKey // 'ezstart' | 'ezauth' | 'ezpay' | etc.
  pageTitle?: string // Override page title
  pageDescription?: string // Override description
  pagePath?: string // Page path for canonical URL
  ogImage?: string // Custom OG image
  themeColor?: string // Override theme color
  locale?: string // Override locale (default: 'en_US')
}
```

---

#### `generateLandingMetadata(appKey)`

Generate comprehensive metadata specifically for landing pages with long descriptions and all keywords.

```tsx
// apps/ezstart/web/src/app/landing-v2/page.tsx
import { generateLandingMetadata } from '@ezstart/seo-config'

export const metadata = generateLandingMetadata('ezstart')

export default function LandingV2() {
  return <LandingPageContent />
}
```

---

### 3. Schema.org Structured Data

#### `generateFAQSchema(appKey)`

Generate FAQ structured data from app config.

```tsx
import { generateFAQSchema } from '@ezstart/seo-config'

export default function Page() {
  const faqSchema = generateFAQSchema('ezstart')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <FAQComponent />
    </>
  )
}
```

**Output:**

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is EZStart really free?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes, 100% open-source under MIT license..."
      }
    }
  ]
}
```

---

#### `generateOrganizationSchema(appKey)`

Generate Organization structured data.

```tsx
import { generateOrganizationSchema } from '@ezstart/seo-config'

const orgSchema = generateOrganizationSchema('ezstart')
```

---

#### `generateSoftwareSchema(appKey)`

Generate SoftwareApplication structured data.

```tsx
import { generateSoftwareSchema } from '@ezstart/seo-config'

const softwareSchema = generateSoftwareSchema('ezstart')
```

---

## 🎨 Available Apps

| App Key          | App Name          | Type                | SEO Priority |
| ---------------- | ----------------- | ------------------- | ------------ |
| `ezstart`        | EZStart           | Developer Platform  | ⭐⭐⭐ Highest |
| `ezauth`         | EZAuth            | SSO Authentication  | ⭐⭐ High     |
| `ezpay`          | EZPay             | Payment System      | ⭐⭐ High     |
| `ezbill`         | EZBill            | Invoicing System    | ⭐⭐ High     |
| `green-pulse`    | GreenPulse        | AI Form Builder     | ⭐ Medium    |
| `fengshui`       | FengShui Analyzer | Feng Shui Analysis  | ⭐ Medium    |
| `asc-tcd`        | ASC-TCD           | Association Website | Low          |

---

## 📖 Complete Usage Examples

### Full Landing Page with SEO

```tsx
// apps/ezstart/web/src/app/landing-v2/page.tsx
import {
  generateLandingMetadata,
  generateFAQSchema,
  generateSoftwareSchema,
  getAppSEO,
} from '@ezstart/seo-config'

export const metadata = generateLandingMetadata('ezstart')

export default function LandingV2() {
  const seoData = getAppSEO('ezstart')
  const faqSchema = generateFAQSchema('ezstart')
  const softwareSchema = generateSoftwareSchema('ezstart')

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

      {/* Hero Section */}
      <Hero title={seoData.tagline} description={seoData.shortDescription} cta={seoData.callToAction} />

      {/* Features Section - Uses SEO data */}
      <Features features={seoData.features} />

      {/* Target Audience Section */}
      <Audience personas={seoData.targetAudience} />

      {/* Use Cases Section */}
      <UseCases cases={seoData.useCases} />

      {/* USPs Section */}
      <USPs usps={seoData.usps} />

      {/* Comparison Section */}
      <Comparison competitors={seoData.vsCompetition} />

      {/* Social Proof */}
      <SocialProof stats={seoData.socialProof.stats} />

      {/* FAQ Section */}
      <FAQ items={seoData.faq} />

      {/* Final CTA */}
      <CTA
        primary={seoData.callToAction.primary}
        secondary={seoData.callToAction.secondary}
        url={seoData.callToAction.url}
      />
    </>
  )
}
```

---

### Dynamic Features Component

```tsx
// components/Features.tsx
import { getAppSEO } from '@ezstart/seo-config'

export function FeaturesSection({ appKey }: { appKey: string }) {
  const seoData = getAppSEO(appKey)

  return (
    <section className="py-20">
      <h2 className="text-4xl font-bold mb-12">Features</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {seoData.features.map(feature => (
          <div key={feature.title} className="p-6 border rounded-lg">
            <h3 className="text-2xl font-semibold mb-4">{feature.title}</h3>
            <p className="text-muted-foreground mb-4">{feature.description}</p>
            <ul className="space-y-2">
              {feature.useCases.map(useCase => (
                <li key={useCase} className="text-sm">
                  • {useCase}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
```

---

### SEO-Optimized Keywords Extraction

```tsx
// Use keywords for content optimization
import { getAppSEO } from '@ezstart/seo-config'

const seoData = getAppSEO('ezstart')

// Primary keywords (highest volume - target these in H1, title, first paragraph)
seoData.keywords.primary
// [
//   { term: 'web development platform', volume: 2400 },
//   { term: 'saas boilerplate', volume: 1900 },
//   ...
// ]

// Secondary keywords (medium volume - use in H2, subheadings)
seoData.keywords.secondary
// [
//   { term: 'rapid development tools', volume: 880 },
//   { term: 'typescript boilerplate', volume: 590 },
//   ...
// ]

// Long-tail keywords (low volume, high intent - use in FAQ, blog posts)
seoData.keywords.longTail
// [
//   { term: 'how to build web apps faster', volume: 110 },
//   { term: 'best saas boilerplate 2025', volume: 90 },
//   ...
// ]
```

---

## 🏗️ Data Sources

All SEO data is extracted from comprehensive documentation:

- **[docs/seo/01-EZSTART-DEEP-DIVE.md](../../docs/seo/01-EZSTART-DEEP-DIVE.md)** - Complete EZStart analysis (500+ lines)
- **[docs/seo/ALL-APPS-SUMMARY.md](../../docs/seo/ALL-APPS-SUMMARY.md)** - Summary of all 8 apps

---

## 🎯 Roadmap

### Phase 1: SEO Enhancement ✅ COMPLETE

- ✅ Phase 1.1: App understanding documentation
- ✅ Phase 1.2: Rich SEO TypeScript configs for all 8 apps
- ✅ Phase 1.3: Enhanced metadata generator

### Phase 2: Landing Components 🔄 NEXT

- Create reusable landing components in `@ezstart/ui`:
  - Hero variants (withVideo, withAnimation, etc.)
  - FeatureGrid, Testimonials, Pricing
  - FAQ, CTA, Stats, LogoCloud
  - Demo, SocialProof components

### Phase 3: Landing Pages 📋 PENDING

- Implement `/landing-v2/page.tsx` for each app
- Use landing components + SEO data

### Phase 4: Assets 📸 PENDING

- Create videos, GIFs, screenshots
- OG images (1200×630)

### Phase 5: Testing & Optimization 🧪 PENDING

- Lighthouse SEO audits
- A/B testing
- Analytics tracking

---

## 📝 TypeScript Support

All exports are fully typed:

```ts
import type {
  // App SEO Data Types
  AppSEOConfig,
  Feature,
  TargetAudience,
  UseCase,
  KeywordStrategy,
  VisualAsset,
  AppSEOKey,

  // Metadata Types
  EnhancedMetadataConfig,
  MetadataConfig,
  RobotsConfig,
  SitemapConfig,
  JsonLdConfig,
} from '@ezstart/seo-config'
```

---

## 🔗 See Also

- **[README.md](./README.md)** - Original documentation (basic features)
- **[docs/seo/01-EZSTART-DEEP-DIVE.md](../../docs/seo/01-EZSTART-DEEP-DIVE.md)** - EZStart deep dive
- **[docs/seo/ALL-APPS-SUMMARY.md](../../docs/seo/ALL-APPS-SUMMARY.md)** - All apps summary

---

## 📄 License

MIT
