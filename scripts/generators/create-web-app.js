#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Get project name from CLI arguments
const projectName = process.argv[2]

if (!projectName) {
  console.error('❌ Please provide a project name')
  console.log('Usage: node scripts/create-web-app.js <project-name>')
  process.exit(1)
}

const rootDir = process.cwd()
const projectPath = path.join(rootDir, 'apps', projectName, 'web')

// Port assignment system (61xx pattern)
// Web Apps: 6XX1 pattern
const EXISTING_PORTS = {
  // APIs (6XX0)
  'ezauth-api': 6110,
  'ezbill-api': 6120,
  // Web Apps (6XX1)
  'ezauth-web': 6111,
  'ezbill-web': 6121,
  // Standalone Web Apps
  'ezstart-web': 6101,
  'asc-tcd-web': 6141,
  'fengshui-web': 6151,
}

// Find next available port
function getNextAvailablePort() {
  const webPorts = Object.values(EXISTING_PORTS)
    .filter(
      port => port.toString().endsWith('1') // Web apps end in 1
    )
    .sort((a, b) => a - b)

  const lastPort = webPorts[webPorts.length - 1] || 6101
  return lastPort + 10 // Increment by 10 to maintain XX1 pattern
}

const assignedPort = getNextAvailablePort()

// Check if project already exists
if (fs.existsSync(projectPath)) {
  console.error(`❌ Project ${projectName} already exists`)
  process.exit(1)
}

console.log(`🚀 Creating new web app: ${projectName}`)

// Create project structure
fs.mkdirSync(projectPath, { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/app/[locale]'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/components'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/i18n'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/messages/en'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'src/scripts'), { recursive: true })
fs.mkdirSync(path.join(projectPath, 'public'), { recursive: true })

// Package.json
const packageJson = {
  name: `web-${projectName}`,
  version: '0.1.0',
  private: true,
  type: 'module',
  scripts: {
    dev: 'node src/scripts/dev-with-port.js',
    'dev:port': 'next dev -p $PORT',
    build:
      'pnpm --filter @ezstart/ui --filter @ezstart/auth-sdk build && next build',
    start: 'next start',
    lint: 'eslint .',
    typecheck: 'tsc --noEmit',
  },
  dependencies: {
    '@ezstart/auth-sdk': 'workspace:*',
    '@ezstart/ui': 'workspace:*',
    deepmerge: '^4.3.1',
    next: '^15.1.6',
    'next-intl': '^4.1.0',
    'next-pwa': '^5.6.0',
    react: '^18.3.1',
    'react-dom': '^18.3.1',
  },
  devDependencies: {
    '@ezstart/eslint-config': 'workspace:*',
    '@ezstart/tailwind-config': 'workspace:*',
    '@ezstart/typescript-config': 'workspace:*',
    '@types/node': '^22.10.6',
    '@types/react': '^19.0.7',
    '@types/react-dom': '^19.0.3',
    autoprefixer: '^10.4.20',
    eslint: '^9.18.0',
    postcss: '^8.5.1',
    tailwindcss: '^3.4.17',
    typescript: '^5.7.3',
  },
}

fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2))

// TypeScript config
const tsConfig = {
  extends: '@ezstart/typescript-config/nextjs.json',
  compilerOptions: {
    composite: true,
    incremental: true,
    plugins: [
      {
        name: 'next',
      },
    ],
    paths: {
      '@/*': ['./src/*'],
    },
  },
  include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
  exclude: ['node_modules'],
}

fs.writeFileSync(path.join(projectPath, 'tsconfig.json'), JSON.stringify(tsConfig, null, 2))

// ESLint config
const eslintConfig = `import eslintConfig from '@ezstart/eslint-config/next-js'

export default [...eslintConfig]
`

fs.writeFileSync(path.join(projectPath, 'eslint.config.js'), eslintConfig)

// Tailwind config
const tailwindConfig = `import type { Config } from 'tailwindcss'
import baseConfig from '@ezstart/tailwind-config/base.js'

const config: Config = {
  presets: [baseConfig],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../../packages/ui/src/**/*.{ts,tsx}',
  ],
}

export default config
`

fs.writeFileSync(path.join(projectPath, 'tailwind.config.ts'), tailwindConfig)

// PostCSS config
const postcssConfig = `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { "@tailwindcss/postcss": {} },
}

export default config
`

fs.writeFileSync(path.join(projectPath, 'postcss.config.mjs'), postcssConfig)

// Next.js config with PWA and next-intl
const nextConfig = `import createNextIntlPlugin from 'next-intl/plugin'
import withPWA from 'next-pwa'

/** @type {import('next').NextConfig} */
const baseConfig = {
  transpilePackages: ['@ezstart/ui', '@ezstart/auth-sdk'],
}

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

export default withNextIntl(pwaConfig(baseConfig))
`

fs.writeFileSync(path.join(projectPath, 'next.config.mjs'), nextConfig)

// .env.example
const envExample = `# Application
NODE_ENV=development
PORT=${assignedPort}
NEXT_PUBLIC_APP_URL=http://localhost:${assignedPort}

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:${assignedPort - 5}/api
`

fs.writeFileSync(path.join(projectPath, '.env.example'), envExample)

// .env.local
const envLocal = `# Application
NODE_ENV=development
PORT=${assignedPort}
NEXT_PUBLIC_APP_URL=http://localhost:${assignedPort}

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:${assignedPort - 5}/api
`

fs.writeFileSync(path.join(projectPath, '.env.local'), envLocal)

// Dev script with port management
const devScriptContent = `import { spawn } from 'child_process'
import net from 'net'

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(port, () => {
      server.once('close', () => resolve(true))
      server.close()
    })
    server.on('error', () => resolve(false))
  })
}

async function findFreePort(startPort = 4000) {
  let port = startPort
  while (!(await isPortFree(port))) {
    port++
  }
  return port
}

async function startDev() {
  const preferredPort = process.env.PORT ? parseInt(process.env.PORT) : ${assignedPort}
  const port = await findFreePort(preferredPort)
  console.log(\`🚀 Starting dev server on port \${port}\`)

  const child = spawn('next', ['dev', '-p', port.toString()], {
    stdio: 'inherit',
    shell: true
  })

  child.on('error', (error) => {
    console.error('Error starting dev server:', error)
  })
}

startDev()
`

fs.writeFileSync(path.join(projectPath, 'src/scripts/dev-with-port.js'), devScriptContent)

// next-env.d.ts
fs.writeFileSync(
  path.join(projectPath, 'next-env.d.ts'),
  `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.\n`
)

// Create i18n configuration files
const routingContent = `import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]

export function getTimeZoneFromLocale(locale: string): string {
  // You can customize this mapping based on your needs
  const timeZoneMap: Record<string, string> = {
    en: 'UTC',
    fr: 'Europe/Paris',
    // Add more locales as needed
  }

  return timeZoneMap[locale] || 'UTC'
}
`

fs.writeFileSync(path.join(projectPath, 'src/i18n/routing.ts'), routingContent)

const requestContent = `import merge from 'deepmerge'
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

function isSupportedLocale(
  locale: string | undefined
): locale is (typeof routing.locales)[number] {
  return locale !== undefined && routing.locales.includes(locale as any)
}

export default getRequestConfig(async ({ requestLocale }) => {
  const resolved = await requestLocale
  const locale = isSupportedLocale(resolved) ? resolved : routing.defaultLocale

  const [common, home] = await Promise.all([
    import(\`../messages/\${locale}/common.json\`),
    import(\`../messages/\${locale}/home.json\`),
  ])

  return {
    locale,
    timeZone: 'UTC',
    messages: merge.all([common.default, home.default]),
  }
})
`

fs.writeFileSync(path.join(projectPath, 'src/i18n/request.ts'), requestContent)

const navigationContent = `import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, useRouter, usePathname, redirect, getPathname } =
  createNavigation(routing)
`

fs.writeFileSync(path.join(projectPath, 'src/i18n/navigation.ts'), navigationContent)

// Create middleware
const middlewareContent = `import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\..*).*)'],
}
`

fs.writeFileSync(path.join(projectPath, 'src/middleware.ts'), middlewareContent)

// Create translation files
const commonTranslations = {
  common: {
    appName: projectName.charAt(0).toUpperCase() + projectName.slice(1),
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Try again',
  },
}

fs.writeFileSync(
  path.join(projectPath, 'src/messages/en/common.json'),
  JSON.stringify(commonTranslations, null, 2)
)

const homeTranslations = {
  home: {
    title: `Welcome to ${projectName.charAt(0).toUpperCase() + projectName.slice(1)}`,
    description: 'This app is pre-configured with all the essentials',
    getStarted: 'Get Started',
  },
}

fs.writeFileSync(
  path.join(projectPath, 'src/messages/en/home.json'),
  JSON.stringify(homeTranslations, null, 2)
)

// Create manifest.json for PWA
const manifestContent = {
  name: projectName.charAt(0).toUpperCase() + projectName.slice(1),
  short_name: projectName.charAt(0).toUpperCase() + projectName.slice(1),
  description: `${projectName.charAt(0).toUpperCase() + projectName.slice(1)} application`,
  start_url: '/',
  display: 'standalone',
  background_color: '#ffffff',
  theme_color: '#000000',
  icons: [
    {
      src: '/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
    },
  ],
}

fs.writeFileSync(
  path.join(projectPath, 'public/manifest.json'),
  JSON.stringify(manifestContent, null, 2)
)

// Create providers directory
fs.mkdirSync(path.join(projectPath, 'src/providers'), { recursive: true })

// Providers.tsx with i18n support
const providersContent = `'use client'

import { AuthProvider } from '@ezstart/auth-sdk'
import { ThemeProvider } from '@ezstart/ui/theme'
import { NextIntlClientProvider } from 'next-intl'
import { ReactNode } from 'react'

interface ProvidersProps {
  children: ReactNode
  locale: string
  messages: any
  timeZone?: string
}

export function Providers({ children, locale, messages, timeZone }: ProvidersProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider appName="${projectName}">
          {children}
        </AuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
`

fs.writeFileSync(path.join(projectPath, 'src/providers/providers.tsx'), providersContent)

// Layout.tsx with i18n and ClientLayout
const layoutContent = `import { getTimeZoneFromLocale } from '@/i18n/routing'
import { Providers } from '@/providers/providers'
import '@ezstart/ui/globals.css'
import type { Metadata } from 'next'
import { getMessages } from 'next-intl/server'
import ClientLayout from './client-layout'

export const metadata: Metadata = {
  title: '${projectName.charAt(0).toUpperCase() + projectName.slice(1)}',
  description: '${projectName.charAt(0).toUpperCase() + projectName.slice(1)} application',
}

interface RootLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  const { locale } = await params
  const messages = await getMessages()
  const timeZone = getTimeZoneFromLocale(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <Providers locale={locale} messages={messages} timeZone={timeZone}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  )
}
`

fs.writeFileSync(path.join(projectPath, 'src/app/[locale]/layout.tsx'), layoutContent)

// Page.tsx with i18n
const pageContent = `'use client'

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

export default function HomePage() {
  const t = useTranslations('home')

  return (
    <main className="container mx-auto p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This app is pre-configured with:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Internationalization (i18n) with next-intl</li>
            <li>Progressive Web App (PWA) support</li>
            <li>@ezstart/ui components library</li>
            <li>@ezstart/ui/theme & auth-sdk providers</li>
            <li>Centralized TypeScript, ESLint, and Tailwind configs</li>
          </ul>
          <div className="pt-4">
            <Button>{t('getStarted')}</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
`

fs.writeFileSync(path.join(projectPath, 'src/app/[locale]/page.tsx'), pageContent)

// ClientLayout component using fully agnostic components
const clientLayoutContent = `'use client'
import { ClientLayout } from '@ezstart/ui/components'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import React from 'react'

const AppClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()

  return (
    <ClientLayout
      appName="${appName}"
      currentPath={pathname}
      logoIcon="lucide:Zap"
      logoHref="/"

      // Header navigation - customize as needed
      headerNavigation={[
        { href: '/', label: 'Home' },
        { href: '/about', label: 'About' },
        { href: '/services', label: 'Services' },
        { href: '/contact', label: 'Contact' },
      ]}

      // CTA Button
      ctaText="Get Started"
      ctaVariant="ghost"
      ctaSize="sm"
      onCtaClick={() => console.log('CTA clicked')}

      // Bottom mobile navigation
      bottomNavigation={[
        { href: '/', icon: 'lucide:Home', label: 'Home' },
        { href: '/about', icon: 'lucide:User', label: 'About' },
        { href: '/services', icon: 'lucide:Briefcase', label: 'Services' },
        { href: '/contact', icon: 'lucide:Mail', label: 'Contact' },
      ]}

      // Social links
      socialLinks={[
        { href: 'https://github.com', icon: 'lucide:Github', label: 'GitHub' },
        { href: 'https://twitter.com', icon: 'lucide:Twitter', label: 'Twitter' },
        { href: 'https://linkedin.com', icon: 'lucide:Linkedin', label: 'LinkedIn' },
      ]}

      // Footer links
      footerLinks={[
        { href: '/privacy', label: 'Privacy Policy' },
        { href: '/terms', label: 'Terms of Service' },
        { href: '/legal', label: 'Legal Notices' },
      ]}

      // Use Next.js Link component
      LinkComponent={Link}
    >
      {children}
    </ClientLayout>
  )
}

export default AppClientLayout
`

fs.writeFileSync(path.join(projectPath, 'src/app/[locale]/client-layout.tsx'), clientLayoutContent)

// Add to root package.json scripts
const rootPackageJsonPath = path.join(rootDir, 'package.json')
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'))

// Add new app to turbo filter scripts if needed
if (!rootPackageJson.scripts[`dev:${projectName}`]) {
  rootPackageJson.scripts[`dev:${projectName}`] = `turbo dev --filter=web-${projectName}`
  fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2))
}

console.log('✅ Project structure created')
console.log('📦 Installing dependencies...')

// Install dependencies
execSync('pnpm install', { stdio: 'inherit', cwd: rootDir })

console.log('\n✨ Project created successfully!')
console.log('\n📝 Configuration:')
console.log(`  • Port assigned: ${assignedPort}`)
console.log(`  • App URL: http://localhost:${assignedPort}`)
console.log('\n📋 Next steps:')
console.log(`  1. Add to CLAUDE.md ports table:`)
console.log(
  `     | ${projectName.charAt(0).toUpperCase() + projectName.slice(1)} | Web | ${assignedPort} | http://localhost:${assignedPort} | ✅ Running |`
)
console.log(`  2. Run: pnpm dev:${projectName}`)
console.log(`  3. Open: http://localhost:${assignedPort}`)
console.log('\n🎉 Happy coding!')
