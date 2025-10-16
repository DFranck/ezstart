# 🔍 SEO Audit Report - @ezstart Monorepo

**Date:** 16/10/2025
**Scope:** Toutes les applications web du monorepo

---

## 📊 Score Global SEO par App

| App | Score | Metadata | robots.txt | sitemap.xml | Open Graph | Structured Data | Performance |
|-----|-------|----------|------------|-------------|------------|-----------------|-------------|
| **EZStart** | 75/100 | ✅ Bon | ❌ Manquant | ❌ Manquant | ⚠️ Partiel | ❌ Manquant | ✅ Bon |
| **EZAuth** | 40/100 | ⚠️ Basique | ❌ Manquant | ❌ Manquant | ❌ Manquant | ❌ Manquant | ✅ Bon |
| **EZBill** | 50/100 | ⚠️ Basique | ❌ Manquant | ❌ Manquant | ❌ Manquant | ❌ Manquant | ✅ Bon |
| **EZPay** | 45/100 | ⚠️ Basique | ❌ Manquant | ❌ Manquant | ❌ Manquant | ❌ Manquant | ✅ Bon |
| **FengShui** | 60/100 | ✅ Bon | ❌ Manquant | ❌ Manquant | ❌ Manquant | ❌ Manquant | ✅ Bon |
| **Tower Defense** | 70/100 | ✅ Bon | ❌ Manquant | ❌ Manquant | ✅ Complet | ❌ Manquant | ✅ Bon |
| **ASC-TCD** | 35/100 | ❌ Manquant | ❌ Manquant | ❌ Manquant | ❌ Manquant | ❌ Manquant | ✅ Bon |

**Score Moyen Monorepo:** 53.6/100 ⚠️

---

## 🎯 Points Forts

### ✅ EZStart (75/100)
- **Metadata PWA complet** : application-name, apple-mobile-web-app
- **i18n support** : Multilangue avec next-intl
- **PWA Ready** : manifest.json, service worker
- **Theme color** : Intégré pour mobile
- **Icônes multiples** : 16x16, 32x32, 152x152, 180x180

### ✅ Tower Defense (70/100)
- **Open Graph complet** : og:title, og:description, og:image, og:url
- **Twitter Cards** : twitter:card, twitter:title, twitter:description, twitter:image
- **Description SEO** : Claire et engageante
- **Social Media Ready** : Partage optimisé

### ✅ FengShui (60/100)
- **Metadata Next.js** : title, description, manifest
- **PWA Config** : appleWebApp avec statusBarStyle
- **Description claire** : Bien ciblée pour le référencement

---

## ❌ Points Faibles Critiques

### 1. **robots.txt Manquant (7/7 apps)**

**Impact SEO :** 🔴 CRITIQUE
**Problème :** Aucune app n'a de `robots.txt` pour guider les crawlers

**Solution :**
```typescript
// apps/[app]/web/src/app/robots.ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: 'https://[domain].vercel.app/sitemap.xml',
  }
}
```

---

### 2. **sitemap.xml Manquant (7/7 apps)**

**Impact SEO :** 🔴 CRITIQUE
**Problème :** Google ne peut pas découvrir automatiquement toutes les pages

**Solution :**
```typescript
// apps/[app]/web/src/app/sitemap.ts
import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://[domain].vercel.app',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://[domain].vercel.app/about',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    // ... autres pages
  ]
}
```

---

### 3. **Open Graph Manquant (5/7 apps)**

**Impact SEO :** 🟠 IMPORTANT
**Problème :** Partage sur réseaux sociaux non optimisé

**Apps concernées :** EZStart, EZAuth, EZBill, EZPay, FengShui

**Solution :**
```typescript
// apps/[app]/web/src/app/layout.tsx
export const metadata: Metadata = {
  title: 'App Name',
  description: 'Description',
  openGraph: {
    title: 'App Name',
    description: 'Description',
    url: 'https://[domain].vercel.app',
    siteName: 'App Name',
    images: [
      {
        url: 'https://[domain].vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'App Name',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'App Name',
    description: 'Description',
    images: ['https://[domain].vercel.app/og-image.png'],
  },
}
```

---

### 4. **Structured Data Manquant (7/7 apps)**

**Impact SEO :** 🟠 IMPORTANT
**Problème :** Pas de rich snippets Google (étoiles, prix, FAQ, etc.)

**Solution :**
```typescript
// apps/[app]/web/src/app/layout.tsx ou page.tsx
export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'App Name',
    description: 'Description',
    url: 'https://[domain].vercel.app',
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Rest of page */}
    </>
  )
}
```

---

### 5. **Metadata Basique (4/7 apps)**

**Impact SEO :** 🟡 MOYEN
**Problème :** Metadata minimaliste (juste title + description)

**Apps concernées :** EZAuth, EZBill, EZPay, ASC-TCD

**Metadata Actuelle (EZAuth) :**
```tsx
<head>
  <title>EZAuth - Authentication</title>
  <meta name="description" content="EZStart centralized authentication service" />
</head>
```

**Metadata Idéale :**
```typescript
export const metadata: Metadata = {
  title: {
    default: 'EZAuth - Authentication',
    template: '%s | EZAuth',
  },
  description: 'Centralized authentication service for EZStart ecosystem',
  keywords: ['authentication', 'SSO', 'OAuth2', 'login', 'security'],
  authors: [{ name: 'EZStart Team' }],
  creator: 'EZStart',
  publisher: 'EZStart',
  metadataBase: new URL('https://ezauth.vercel.app'),
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
  verification: {
    google: 'google-site-verification-code',
  },
}
```

---

## 🚀 Plan d'Action Prioritaire

### Phase 1 : Fixes Critiques (1-2h)

1. **Créer robots.ts pour toutes les apps**
   - Template réutilisable dans `@ezstart/next-config`
   - Génération automatique avec le bon domaine

2. **Créer sitemap.ts pour toutes les apps**
   - Template de base avec pages principales
   - Hook pour ajouter pages dynamiques

3. **Ajouter Open Graph dans toutes les apps**
   - Utiliser metadata Next.js
   - Créer images OG (1200x630) pour chaque app

### Phase 2 : Optimisations (2-3h)

4. **Enrichir metadata de base**
   - Keywords ciblés par app
   - Authors, creator, publisher
   - Canonical URLs
   - Verification Google/Bing

5. **Ajouter Structured Data**
   - WebApplication pour apps SaaS
   - Organization pour pages about
   - BreadcrumbList pour navigation

6. **Images OG automatiques**
   - Générer avec `@vercel/og`
   - Template réutilisable par app

### Phase 3 : Performance & Analytics (1-2h)

7. **Google Analytics / Search Console**
   - Setup GA4 sur toutes les apps
   - Soumettre sitemaps à Search Console

8. **Performance Monitoring**
   - Lighthouse CI dans GitHub Actions
   - Suivi Core Web Vitals

---

## 📦 Package Centralisé SEO (Recommandé)

Créer `@ezstart/seo-config` pour partager :

```typescript
// packages/seo-config/src/metadata.ts
export function createMetadata(config: {
  appName: string
  description: string
  domain: string
  keywords?: string[]
}): Metadata {
  return {
    title: {
      default: config.appName,
      template: `%s | ${config.appName}`,
    },
    description: config.description,
    keywords: config.keywords,
    metadataBase: new URL(config.domain),
    openGraph: {
      title: config.appName,
      description: config.description,
      url: config.domain,
      siteName: config.appName,
      images: [`${config.domain}/og-image.png`],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: config.appName,
      description: config.description,
      images: [`${config.domain}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

// packages/seo-config/src/robots.ts
export function createRobots(domain: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/'],
    },
    sitemap: `${domain}/sitemap.xml`,
  }
}

// packages/seo-config/src/sitemap.ts
export function createSitemap(
  domain: string,
  routes: string[]
): MetadataRoute.Sitemap {
  return routes.map(route => ({
    url: `${domain}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: route === '/' ? 1 : 0.8,
  }))
}
```

**Usage dans les apps :**
```typescript
// apps/[app]/web/src/app/layout.tsx
import { createMetadata } from '@ezstart/seo-config'

export const metadata = createMetadata({
  appName: 'EZAuth',
  description: 'Centralized authentication service',
  domain: 'https://ezauth.vercel.app',
  keywords: ['auth', 'SSO', 'OAuth2'],
})

// apps/[app]/web/src/app/robots.ts
import { createRobots } from '@ezstart/seo-config'
export default function robots() {
  return createRobots('https://ezauth.vercel.app')
}

// apps/[app]/web/src/app/sitemap.ts
import { createSitemap } from '@ezstart/seo-config'
export default function sitemap() {
  return createSitemap('https://ezauth.vercel.app', ['/', '/login', '/register'])
}
```

---

## 🎯 Résultat Attendu Après Fixes

| App | Score Actuel | Score Cible | Gain |
|-----|--------------|-------------|------|
| EZStart | 75/100 | **95/100** | +20 |
| EZAuth | 40/100 | **85/100** | +45 |
| EZBill | 50/100 | **85/100** | +35 |
| EZPay | 45/100 | **85/100** | +40 |
| FengShui | 60/100 | **90/100** | +30 |
| Tower Defense | 70/100 | **95/100** | +25 |
| ASC-TCD | 35/100 | **85/100** | +50 |

**Score Moyen Monorepo :** 53.6/100 → **88.6/100** (+35 points) 🚀

---

## 📚 Ressources

- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Next.js robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Next.js sitemap.xml](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Open Graph Protocol](https://ogp.me/)
- [Schema.org](https://schema.org/)
- [Google Search Central](https://developers.google.com/search)

---

**Prochaine Étape :** Créer le package `@ezstart/seo-config` et implémenter Phase 1 ? 🚀
