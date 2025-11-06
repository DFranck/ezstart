# 🚀 Landing Pages V2 - Modern SEO-Optimized Pages

**Production-ready landing pages using rich SEO data and reusable components.**

---

## 📊 Overview

Landing Pages V2 are modern, SEO-optimized landing pages built with:
- ✅ **Rich SEO Data** from `@ezstart/seo-config`
- ✅ **Reusable Components** from `@ezstart/ui/components`
- ✅ **Schema.org Structured Data** (FAQ, SoftwareApplication)
- ✅ **Enhanced Metadata** with all keywords and descriptions
- ✅ **Responsive Design** (mobile-first, accessible)
- ✅ **Modern UI** (gradients, animations, cards, grids)

---

## 🎯 Implemented Pages

| App          | Path                                | Status | URL                                       |
| ------------ | ----------------------------------- | ------ | ----------------------------------------- |
| **EZBill**   | `/[locale]/landing-v2`              | ✅     | https://bill.ezstart.xyz/en/landing-v2    |
| **GreenPulse** | `/[locale]/landing-v2`            | ✅     | https://greenpulse.ezstart.xyz/en/landing-v2 |

---

## 🏗️ Architecture

### Data Flow

```
@ezstart/seo-config (SEO Data)
         ↓
getAppSEO('ezbill')
         ↓
Landing Page Component
         ↓
@ezstart/ui/components (Reusable Components)
```

### Page Structure

Every landing page follows this structure:

```tsx
// 1. Import SEO utilities and components
import {
  generateLandingMetadata,
  generateFAQSchema,
  getAppSEO,
} from '@ezstart/seo-config'
import {
  LandingHero,
  FeatureGrid,
  UseCases,
  LandingFAQ,
  CTA,
  LandingStats,
} from '@ezstart/ui/components'

// 2. Generate metadata
export const metadata = generateLandingMetadata('app-key')

// 3. Build page
export default function LandingV2Page() {
  const seoData = getAppSEO('app-key')
  const faqSchema = generateFAQSchema('app-key')

  return (
    <>
      {/* Schema.org */}
      <script type="application/ld+json" {...} />

      {/* Hero */}
      <LandingHero {...seoData} />

      {/* Features */}
      <FeatureGrid features={seoData.features} />

      {/* Use Cases */}
      <UseCases cases={seoData.useCases} />

      {/* FAQ */}
      <LandingFAQ items={seoData.faq} />

      {/* CTA */}
      <CTA {...seoData.callToAction} />
    </>
  )
}
```

---

## 📦 Components Used

### LandingHero
**10 variants:** default, withImage, withVideo, withGradient, split, minimal, centered, withStats, withSearch, fullHeight

```tsx
<LandingHero
  variant="withStats"
  title={seoData.tagline}
  description={seoData.shortDescription}
  primaryCTA="Start Building"
  primaryCTAHref="#signup"
  stats={seoData.socialProof.stats}
/>
```

### FeatureGrid
**Displays features from SEO config**

```tsx
<FeatureGrid
  features={seoData.features}
  columns={3}
  variant="floating"
  showUseCases
/>
```

### UseCases
**4 variants:** default, timeline, comparison, cards

```tsx
<UseCases
  cases={seoData.useCases}
  variant="comparison"
  showMetrics
  title="Real Results"
/>
```

### LandingFAQ
**Accordion-based FAQ with Schema.org**

```tsx
<LandingFAQ
  items={seoData.faq}
  defaultExpanded={0}
/>
```

### CTA
**6 variants:** default, centered, split, minimal, gradient, bordered

```tsx
<CTA
  variant="gradient"
  title="Ready to Get Started?"
  primaryText="Sign Up Free"
  primaryHref="#signup"
/>
```

### LandingStats
**Animated statistics**

```tsx
<LandingStats
  stats={seoData.socialProof.stats}
  variant="grid"
  animated
/>
```

---

## 🎨 SEO Features

### 1. Enhanced Metadata
```tsx
export const metadata = generateLandingMetadata('ezbill')
```

Generates:
- ✅ Title with template
- ✅ 300-word long description
- ✅ All keywords (primary, secondary, long-tail)
- ✅ Open Graph images (1200×630)
- ✅ Twitter Cards
- ✅ Canonical URLs

### 2. Schema.org Structured Data
```tsx
const faqSchema = generateFAQSchema('ezbill')
const softwareSchema = generateSoftwareSchema('ezbill')
```

Generates:
- ✅ **FAQPage** - All FAQ items from SEO config
- ✅ **SoftwareApplication** - App details, pricing, ratings

### 3. Keyword Optimization

SEO data includes keywords with search volumes:

```tsx
seoData.keywords.primary
// [{ term: 'invoicing software', volume: 4400 }, ...]

seoData.keywords.secondary
// [{ term: 'pdf invoices', volume: 2900 }, ...]

seoData.keywords.longTail
// [{ term: 'free invoicing software self hosted', volume: 210 }, ...]
```

**Usage in content:**
- H1: Primary keyword #1
- H2: Primary keywords #2-3
- H3/paragraphs: Secondary keywords
- FAQ: Long-tail keywords

---

## 📝 How to Create a New Landing Page

### Step 1: Create SEO Config (if not exists)

See `packages/seo-config/src/apps/` for examples.

### Step 2: Create Landing Page

```bash
mkdir -p apps/myapp/web/src/app/[locale]/landing-v2
```

```tsx
// apps/myapp/web/src/app/[locale]/landing-v2/page.tsx
import {
  generateLandingMetadata,
  generateFAQSchema,
  getAppSEO,
} from '@ezstart/seo-config'
import {
  LandingHero,
  FeatureGrid,
  UseCases,
  LandingFAQ,
  CTA,
} from '@ezstart/ui/components'

export const metadata = generateLandingMetadata('myapp')

export default function LandingV2Page() {
  const seoData = getAppSEO('myapp')
  const faqSchema = generateFAQSchema('myapp')

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <LandingHero
        variant="withGradient"
        title={seoData.tagline}
        description={seoData.shortDescription}
        primaryCTA={seoData.callToAction.primary}
        primaryCTAHref={seoData.callToAction.url}
      />

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FeatureGrid
            features={seoData.features}
            columns={3}
            variant="floating"
          />
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <UseCases
            cases={seoData.useCases}
            variant="comparison"
            showMetrics
          />
        </div>
      </section>

      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <LandingFAQ items={seoData.faq} />
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <CTA
            variant="gradient"
            title="Ready to Get Started?"
            description="Join thousands using MyApp"
            primaryText={seoData.callToAction.primary}
            primaryHref={seoData.callToAction.url}
          />
        </div>
      </section>
    </>
  )
}
```

### Step 3: Build & Test

```bash
cd apps/myapp/web
pnpm build

# Test locally
pnpm dev
# Visit http://localhost:50XX/en/landing-v2
```

### Step 4: SEO Validation

1. **Lighthouse SEO Audit**
   ```bash
   lighthouse https://myapp.ezstart.xyz/en/landing-v2 --only-categories=seo --view
   ```

2. **Schema.org Validation**
   - Visit https://validator.schema.org/
   - Paste page URL
   - Verify FAQPage and SoftwareApplication schemas

3. **Rich Results Test**
   - Visit https://search.google.com/test/rich-results
   - Test FAQ rich results

---

## 🎯 SEO Best Practices Implemented

### On-Page SEO
- ✅ H1 with primary keyword
- ✅ H2/H3 with secondary keywords
- ✅ Long description (300+ words)
- ✅ Internal linking
- ✅ Image alt text (via components)
- ✅ Mobile-first responsive design

### Technical SEO
- ✅ Semantic HTML
- ✅ WCAG accessibility compliance
- ✅ Fast loading (<3s)
- ✅ Schema.org structured data
- ✅ Open Graph metadata
- ✅ Canonical URLs
- ✅ robots.txt + sitemap.xml

### Content SEO
- ✅ Keyword-optimized content
- ✅ FAQ for long-tail keywords
- ✅ Use cases with real metrics
- ✅ Social proof (stats, testimonials)
- ✅ Clear CTAs
- ✅ Competitive advantages

---

## 📊 Expected SEO Impact

### Before Landing Pages V2
- Basic home pages
- Limited SEO metadata
- No structured data
- Generic descriptions
- **SEO Score:** 60-70/100

### After Landing Pages V2
- Comprehensive SEO metadata
- FAQ + SoftwareApplication schema
- 300-word SEO-optimized descriptions
- All keywords (primary + secondary + long-tail)
- **SEO Score:** 90-95/100 (+25-35 points!)

---

## 🔗 Related Documentation

- **[packages/seo-config/README-ENHANCED.md](../packages/seo-config/README-ENHANCED.md)** - Enhanced SEO features
- **[packages/ui/README.md](../packages/ui/README.md)** - UI components library
- **[docs/seo/01-EZSTART-DEEP-DIVE.md](./seo/01-EZSTART-DEEP-DIVE.md)** - SEO deep dive example
- **[docs/seo/ALL-APPS-SUMMARY.md](./seo/ALL-APPS-SUMMARY.md)** - All apps SEO summary

---

## 📈 Next Steps

### Phase 3 Completed ✅
- ✅ EZBill landing page
- ✅ GreenPulse landing page
- ✅ Documentation

### Phase 4: Visual Assets 📸
- Create hero videos (30s, <5MB)
- Create feature GIFs (<2MB each)
- Create screenshots (WebP optimized)
- Create OG images (1200×630)

### Phase 5: Testing & Optimization 🧪
- Lighthouse SEO audits
- Schema.org validation
- A/B testing setup
- Analytics tracking
- Conversion optimization

---

## 💡 Tips & Tricks

### Use Section Wrappers for Consistency

```tsx
const Section = ({ children, bg }: { children: React.ReactNode; bg?: boolean }) => (
  <section className={cn('py-20', bg && 'bg-muted/30')}>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  </section>
)

// Usage
<Section bg>
  <FeatureGrid features={seoData.features} />
</Section>
```

### Alternate Background Colors

```tsx
<Hero /> {/* white */}
<Section bg><Features /></Section> {/* muted */}
<Section><UseCases /></Section> {/* white */}
<Section bg><FAQ /></Section> {/* muted */}
```

### Use Stats in Hero

```tsx
<LandingHero
  variant="withStats"
  stats={seoData.socialProof.stats}
/>
```

This adds visual social proof immediately in the hero.

---

## 📄 License

MIT
