⚠️ **MIGRATION NOTE:** This README contains outdated environment variable examples.
URLs are now auto-configured via `@ezstart/config`. See [packages/config/README.md](../../packages/config/README.md) for current usage.

# GreenPulse Web

Frontend application for GreenPulse eco-tracking and sustainability platform.

## Overview

GreenPulse Web is a Next.js application that helps users track their carbon footprint, build eco-friendly habits, and get AI-powered sustainability recommendations. Built with React 18, Next.js 15, and next-intl for internationalization.

## Features

- 🌱 **Carbon Footprint Tracker** - Monitor daily environmental impact
- 📊 **Habit Dashboard** - Track eco-friendly routines
- 🤖 **AI Recommendations** - Get personalized sustainability tips
- 📈 **Analytics & Insights** - Visualize progress and trends
- 🌍 **Multilingual** - i18n support with next-intl
- 🎨 **Dark Mode** - Theme switching with @ezstart/next-theme
- 🔐 **Authentication** - Secure login with @ezstart/auth-sdk
- 📱 **Progressive Web App** - Installable with next-pwa

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Runtime:** React 18
- **Styling:** Tailwind CSS
- **Components:** @ezstart/ui
- **Authentication:** @ezstart/auth-sdk
- **Internationalization:** next-intl
- **Theme:** @ezstart/next-theme
- **PWA:** next-pwa

## Installation

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm --filter web-green-pulse dev
```

## Environment Variables

Create `.env.local` in this directory:

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5070/api

# App
NEXT_PUBLIC_APP_URL=http://localhost:5075
NODE_ENV=development
PORT=5075

# OpenAI (optional for client-side features)
NEXT_PUBLIC_OPENAI_KEY=sk-...
```

## Scripts

```bash
# Development
pnpm dev              # Start dev server on port 5075

# Build
pnpm build            # Build for production
pnpm start            # Start production server

# Quality
pnpm typecheck        # TypeScript checking
pnpm lint             # ESLint
```

## Project Structure

```
apps/green-pulse/web/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── [locale]/     # Internationalized routes
│   │   │   ├── page.tsx           # Home/Dashboard
│   │   │   ├── carbon/            # Carbon tracking
│   │   │   ├── habits/            # Habit management
│   │   │   ├── recommendations/   # AI tips
│   │   │   └── analytics/         # Stats & insights
│   │   └── layout.tsx
│   ├── components/       # React components
│   │   ├── dashboard/
│   │   ├── carbon/
│   │   ├── habits/
│   │   └── shared/
│   ├── providers/        # Context providers
│   ├── i18n/             # Internationalization config
│   ├── messages/         # Translation files
│   │   ├── en.json
│   │   └── fr.json
│   └── middleware.ts     # Next.js middleware (auth, i18n)
├── public/
│   ├── manifest.json     # PWA manifest
│   └── icons/
├── package.json
├── next.config.mjs
├── tailwind.config.js
└── README.md
```

## Key Features

### 1. Carbon Tracking

Track daily activities and their environmental impact:

```tsx
import { CarbonForm } from '@/components/carbon/CarbonForm'
import { CarbonChart } from '@/components/carbon/CarbonChart'

export default function CarbonPage() {
  return (
    <div>
      <CarbonForm />
      <CarbonChart />
    </div>
  )
}
```

### 2. Habit Management

Build and track eco-friendly habits:

```tsx
import { HabitList } from '@/components/habits/HabitList'
import { HabitTracker } from '@/components/habits/HabitTracker'

export default function HabitsPage() {
  return (
    <div>
      <HabitList />
      <HabitTracker />
    </div>
  )
}
```

### 3. AI Recommendations

Get personalized sustainability tips:

```tsx
import { RecommendationCard } from '@/components/recommendations/Card'

export default function RecommendationsPage() {
  const { recommendations } = useRecommendations()

  return (
    <div>
      {recommendations.map(rec => (
        <RecommendationCard key={rec.id} {...rec} />
      ))}
    </div>
  )
}
```

### 4. Internationalization

Full i18n support with next-intl:

```tsx
import { useTranslations } from 'next-intl'

export default function Component() {
  const t = useTranslations('carbon')

  return <h1>{t('title')}</h1>
}
```

```json
// messages/en.json
{
  "carbon": {
    "title": "Carbon Footprint Tracker",
    "categories": {
      "transport": "Transport",
      "food": "Food",
      "energy": "Energy"
    }
  }
}
```

## Providers Setup

```tsx
// app/layout.tsx
import { ThemeProvider } from '@ezstart/next-theme'
import { AuthProvider } from '@ezstart/auth-sdk'
import { NextIntlClientProvider } from 'next-intl'

export default function RootLayout({ children, params: { locale } }) {
  const messages = await getMessages(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>
            <AuthProvider appName="green-pulse">
              {children}
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
```

## API Integration

Connect to GreenPulse API:

```tsx
import { callApi } from '@ezstart/auth-sdk'

// Get carbon entries
const entries = await callApi('/carbon')

// Add carbon entry
const newEntry = await callApi('/carbon', {
  method: 'POST',
  body: JSON.stringify({
    category: 'transport',
    amount: 5.2,
    description: 'Car commute'
  })
})
```

## Progressive Web App

GreenPulse is installable as a PWA:

```javascript
// next.config.mjs
import withPWA from 'next-pwa'

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
})
```

## Deployment

### Vercel Configuration

```yaml
Project Settings:
  Root Directory: apps/green-pulse/web
  Include files outside root: ✅ Checked

Build Settings:
  Build Command: pnpm build
  Output Directory: .next
  Install Command: pnpm install

Environment Variables:
  NEXT_PUBLIC_API_URL=https://greenpulse-api.onrender.com/api
  NEXT_PUBLIC_APP_URL=https://greenpulse.vercel.app
```

### Production URL

**🚀 Live App:** https://greenpulse-web.vercel.app (example)

## Development Guidelines

1. **Use @ezstart/ui components** - Never use native HTML elements
2. **Follow semantic colors** - Use `text-muted-foreground`, `bg-primary`, etc.
3. **Add translations** - All text must support i18n
4. **Implement loading states** - Use Suspense and loading.tsx
5. **Handle errors gracefully** - Use error.tsx boundaries
6. **Optimize images** - Use Next.js Image component
7. **Protect routes** - Use auth middleware for private pages

## Example: Protected Route

```tsx
// middleware.ts
import { authMiddleware } from '@ezstart/auth-sdk/middleware'
import createIntlMiddleware from 'next-intl/middleware'

export default authMiddleware({
  publicRoutes: ['/'],
  afterAuth: createIntlMiddleware({
    locales: ['en', 'fr'],
    defaultLocale: 'en'
  })
})

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)']
}
```

## Related Links

- [API Documentation](../api) - Backend API
- [@ezstart/ui](../../../packages/ui) - UI components
- [@ezstart/auth-sdk](../../../packages/auth-sdk) - Auth client
- [@ezstart/next-theme](../../../packages/next-theme) - Theme provider
- [Next.js Docs](https://nextjs.org/docs)
- [next-intl Docs](https://next-intl-docs.vercel.app)

## Contributing

This is part of the @ezstart monorepo. Follow these guidelines:

1. Use shared packages when possible
2. Keep components agnostic and reusable
3. Add TypeScript types for all props
4. Write semantic HTML with ARIA labels
5. Test in both light and dark mode
6. Support both English and French

## License

MIT © EZStart
