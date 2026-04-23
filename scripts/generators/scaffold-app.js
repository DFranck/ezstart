#!/usr/bin/env node

/**
 * @ezstart/scaffold-app - Flexible app scaffolding with options
 *
 * Creates a NEW empty app under apps/<name>/ with optional api/, web/, types/ sub-projects,
 * then wires it into the monorepo (urls.ts ports, root tsconfig, dev scripts).
 *
 * For the reverse of extract-app (import an existing standalone BACK into the monorepo),
 * see `insert-app.js`.
 *
 * Usage:
 *   node scripts/generators/scaffold-app.js --name my-app --has-api --has-web --depends-on ezauth
 *
 * Arguments:
 *   --name        (required) App name in kebab-case
 *   --has-api     Create the API sub-package
 *   --has-web     Create the web sub-package
 *   --has-types   Create the types sub-package (default: true)
 *   --no-types    Skip the types sub-package
 *   --depends-on  Comma-separated list of app dependencies (for dev script turbo filters)
 *   --shortcut    Custom shortcut for pnpm dev:x (default: auto-generated)
 *   --description Custom description for the app
 */

const path = require('path')
const { execSync } = require('child_process')
const {
  ROOT_DIR,
  APPS_DIR,
  renderTemplate,
  findNextPortPair,
  findNextApiPort,
  findNextWebPort,
  toPascalCase,
  generateShortcut,
  registerInUrls,
  addTsconfigReferences,
  addDevScript,
  appExists,
  mkdirp,
  writeFile,
} = require('./lib/utils')

// --- Parse args ---
function parseArgs(argv) {
  const args = {
    name: null,
    hasApi: false,
    hasWeb: false,
    hasTypes: true,
    dependsOn: [],
    shortcut: null,
    description: null,
  }

  let i = 2
  while (i < argv.length) {
    const arg = argv[i]
    switch (arg) {
      case '--name':
        args.name = argv[++i]
        break
      case '--has-api':
        args.hasApi = true
        break
      case '--has-web':
        args.hasWeb = true
        break
      case '--has-types':
        args.hasTypes = true
        break
      case '--no-types':
        args.hasTypes = false
        break
      case '--depends-on':
        args.dependsOn = argv[++i]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
        break
      case '--shortcut':
        args.shortcut = argv[++i]
        break
      case '--description':
        args.description = argv[++i]
        break
      default:
        console.error(`Unknown argument: ${arg}`)
        process.exit(1)
    }
    i++
  }

  return args
}

const args = parseArgs(process.argv)

if (!args.name) {
  console.error(
    'Usage: node scripts/generators/scaffold-app.js --name <app-name> [--has-api] [--has-web] [--depends-on app1,app2] [--shortcut xx]'
  )
  console.error('')
  console.error('Examples:')
  console.error(
    '  node scripts/generators/scaffold-app.js --name my-app --has-api --has-web --depends-on ezauth'
  )
  console.error('  node scripts/generators/scaffold-app.js --name my-tool --has-web --shortcut mt')
  process.exit(1)
}

if (!/^[a-z][a-z0-9-]*$/.test(args.name)) {
  console.error('App name must be kebab-case (lowercase letters, numbers, hyphens)')
  process.exit(1)
}

if (!args.hasApi && !args.hasWeb) {
  console.error('At least one of --has-api or --has-web is required')
  process.exit(1)
}

if (appExists(args.name)) {
  console.error(`App "${args.name}" already exists at apps/${args.name}/`)
  process.exit(1)
}

// --- Config ---
const appName = args.name
const displayName = toPascalCase(appName)
const shortcut = args.shortcut || generateShortcut(appName)
const description = args.description || `${displayName} application`

// Determine ports
let apiPort = null
let webPort = null

if (args.hasApi && args.hasWeb) {
  const pair = findNextPortPair()
  apiPort = pair.apiPort
  webPort = pair.webPort
} else if (args.hasApi) {
  apiPort = findNextApiPort()
} else if (args.hasWeb) {
  webPort = findNextWebPort()
}

const appDir = path.join(APPS_DIR, appName)

const vars = {
  APP_NAME: appName,
  DISPLAY_NAME: displayName,
  DESCRIPTION: description,
  API_PORT: apiPort ? String(apiPort) : '',
  WEB_PORT: webPort ? String(webPort) : '',
  SHORTCUT: shortcut,
}

console.log(`\nCreating app: ${appName}`)
console.log(`  Display name: ${displayName}`)
if (apiPort) console.log(`  API port: ${apiPort}`)
if (webPort) console.log(`  Web port: ${webPort}`)
console.log(`  Dev shortcut: pnpm dev:${shortcut}`)
console.log(
  `  Components: ${[args.hasApi && 'api', args.hasWeb && 'web', args.hasTypes && 'types'].filter(Boolean).join(', ')}`
)
if (args.dependsOn.length) console.log(`  Depends on: ${args.dependsOn.join(', ')}`)
console.log()

// --- Create API ---
if (args.hasApi) {
  console.log('Creating api/ ...')
  const apiDir = path.join(appDir, 'api')
  mkdirp(path.join(apiDir, 'src', 'routes'))
  mkdirp(path.join(apiDir, 'src', 'middleware'))
  mkdirp(path.join(apiDir, 'src', 'services'))

  writeFile(path.join(apiDir, 'package.json'), renderTemplate('api/package.json', vars))
  writeFile(path.join(apiDir, 'src', 'server.ts'), renderTemplate('api/index.ts', vars))

  writeFile(
    path.join(apiDir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '@ezstart/typescript-config/api.json',
        compilerOptions: { composite: true, outDir: 'dist', rootDir: 'src' },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2
    )
  )

  writeFile(
    path.join(apiDir, 'eslint.config.js'),
    `import eslintConfig from '@ezstart/eslint-config/base'\n\nexport default [...eslintConfig]\n`
  )

  const corsOrigin = webPort ? `http://localhost:${webPort}` : 'http://localhost:3000'
  const envContent = `# Server
NODE_ENV=development
PORT=${apiPort}

# Database
MONGODB_URI=mongodb://localhost:27017/${appName}

# CORS
CORS_ORIGIN=${corsOrigin}
`
  writeFile(path.join(apiDir, '.env.example'), envContent)
  writeFile(path.join(apiDir, '.env.local'), envContent)
}

// --- Create Web ---
if (args.hasWeb) {
  console.log('Creating web/ ...')
  const webDir = path.join(appDir, 'web')
  mkdirp(path.join(webDir, 'src', 'app', '[locale]'))
  mkdirp(path.join(webDir, 'src', 'components'))
  mkdirp(path.join(webDir, 'src', 'i18n'))
  mkdirp(path.join(webDir, 'src', 'messages', 'en'))
  mkdirp(path.join(webDir, 'src', 'scripts'))
  mkdirp(path.join(webDir, 'src', 'providers'))
  mkdirp(path.join(webDir, 'public'))

  writeFile(path.join(webDir, 'package.json'), renderTemplate('web/package.json', vars))

  writeFile(
    path.join(webDir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '@ezstart/typescript-config/nextjs.json',
        compilerOptions: {
          composite: true,
          incremental: true,
          plugins: [{ name: 'next' }],
          paths: { '@/*': ['./src/*'] },
        },
        include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2
    )
  )

  writeFile(
    path.join(webDir, 'eslint.config.js'),
    `import eslintConfig from '@ezstart/eslint-config/next-js'\n\nexport default [...eslintConfig]\n`
  )

  writeFile(
    path.join(webDir, 'tailwind.config.ts'),
    `import type { Config } from 'tailwindcss'
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
  )

  writeFile(
    path.join(webDir, 'postcss.config.mjs'),
    `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: { "@tailwindcss/postcss": {} },
}

export default config
`
  )

  writeFile(
    path.join(webDir, 'next.config.mjs'),
    `import createNextIntlPlugin from 'next-intl/plugin'
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
  )

  writeFile(
    path.join(webDir, 'next-env.d.ts'),
    `/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n\n// NOTE: This file should not be edited\n// see https://nextjs.org/docs/app/building-your-application/configuring/typescript for more information.\n`
  )

  const apiUrl = apiPort ? `http://localhost:${apiPort}/api` : ''
  const webEnvContent = `# Application
NODE_ENV=development
PORT=${webPort}
NEXT_PUBLIC_APP_URL=http://localhost:${webPort}
${apiUrl ? `\n# API URLs\nNEXT_PUBLIC_API_URL=${apiUrl}` : ''}
`
  writeFile(path.join(webDir, '.env.example'), webEnvContent)
  writeFile(path.join(webDir, '.env.local'), webEnvContent)

  // i18n files
  writeFile(
    path.join(webDir, 'src', 'i18n', 'routing.ts'),
    `import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en'],
  defaultLocale: 'en',
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]

export function getTimeZoneFromLocale(locale: string): string {
  const timeZoneMap: Record<string, string> = {
    en: 'UTC',
    fr: 'Europe/Paris',
  }
  return timeZoneMap[locale] || 'UTC'
}
`
  )

  writeFile(
    path.join(webDir, 'src', 'i18n', 'request.ts'),
    `import merge from 'deepmerge'
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
  )

  writeFile(
    path.join(webDir, 'src', 'i18n', 'navigation.ts'),
    `import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, useRouter, usePathname, redirect, getPathname } =
  createNavigation(routing)
`
  )

  writeFile(
    path.join(webDir, 'src', 'middleware.ts'),
    `import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\\\..*).*)'],
}
`
  )

  writeFile(
    path.join(webDir, 'src', 'messages', 'en', 'common.json'),
    JSON.stringify(
      {
        common: {
          appName: displayName,
          loading: 'Loading...',
          error: 'An error occurred',
          retry: 'Try again',
        },
      },
      null,
      2
    )
  )

  writeFile(
    path.join(webDir, 'src', 'messages', 'en', 'home.json'),
    JSON.stringify(
      {
        home: {
          title: `Welcome to ${displayName}`,
          description: 'This app is pre-configured with all the essentials',
          getStarted: 'Get Started',
        },
      },
      null,
      2
    )
  )

  writeFile(
    path.join(webDir, 'public', 'manifest.json'),
    JSON.stringify(
      {
        name: displayName,
        short_name: displayName,
        description: `${displayName} application`,
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#000000',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      null,
      2
    )
  )

  writeFile(
    path.join(webDir, 'src', 'providers', 'providers.tsx'),
    `'use client'

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
        <AuthProvider appName="${appName}">
          {children}
        </AuthProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  )
}
`
  )

  writeFile(
    path.join(webDir, 'src', 'app', '[locale]', 'layout.tsx'),
    `import { getTimeZoneFromLocale } from '@/i18n/routing'
import { Providers } from '@/providers/providers'
import '@ezstart/ui/globals.css'
import type { Metadata } from 'next'
import { getMessages } from 'next-intl/server'

export const metadata: Metadata = {
  title: '${displayName}',
  description: '${displayName} application',
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
          {children}
        </Providers>
      </body>
    </html>
  )
}
`
  )

  writeFile(
    path.join(webDir, 'src', 'app', '[locale]', 'page.tsx'),
    `'use client'

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
  )

  writeFile(
    path.join(webDir, 'src', 'scripts', 'dev-with-port.js'),
    `import { spawn } from 'child_process'
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
  const preferredPort = process.env.PORT ? parseInt(process.env.PORT) : ${webPort}
  const port = await findFreePort(preferredPort)
  console.log(\`Starting dev server on port \${port}\`)

  const child = spawn('next', ['dev', '-p', port.toString()], {
    stdio: 'inherit',
    shell: true,
  })

  child.on('error', (error) => {
    console.error('Error starting dev server:', error)
  })
}

startDev()
`
  )
}

// --- Create Types ---
if (args.hasTypes) {
  console.log('Creating types/ ...')
  const typesDir = path.join(appDir, 'types')
  mkdirp(path.join(typesDir, 'src'))

  writeFile(path.join(typesDir, 'package.json'), renderTemplate('types/package.json', vars))

  writeFile(
    path.join(typesDir, 'tsconfig.json'),
    JSON.stringify(
      {
        extends: '@ezstart/typescript-config/library.json',
        compilerOptions: { composite: true, outDir: 'dist', rootDir: 'src' },
        include: ['src/**/*'],
        exclude: ['node_modules', 'dist'],
      },
      null,
      2
    )
  )

  writeFile(path.join(typesDir, 'src', 'index.ts'), `// ${displayName} shared types\nexport {}\n`)
}

// --- Create README.md ---
// Note: BACKLOG is single-file at monorepo root (BACKLOG.md + BACKLOG-HISTORY.md) — no per-app backlog
console.log('Creating README.md ...')
writeFile(path.join(appDir, 'README.md'), renderTemplate('README.md', vars))

// --- Register in monorepo ---
console.log('\nRegistering in monorepo...')
registerInUrls(appName, displayName, description, apiPort, webPort, args.hasApi, args.hasWeb)
addTsconfigReferences(appName, args.hasApi, args.hasWeb, args.hasTypes)
addDevScript(appName, shortcut, args.dependsOn, args.hasApi, args.hasWeb)

// --- Install ---
console.log('\nInstalling dependencies...')
execSync('pnpm install', { stdio: 'inherit', cwd: ROOT_DIR })

// --- Done ---
console.log(`\nApp "${appName}" created successfully!`)
console.log(`\nStructure:`)
console.log(`  apps/${appName}/`)
if (args.hasApi) console.log(`  ├── api/        Express API (port ${apiPort})`)
if (args.hasWeb) console.log(`  ├── web/        Next.js frontend (port ${webPort})`)
if (args.hasTypes) console.log(`  ├── types/      Shared TypeScript types`)
console.log(`  └── README.md`)
console.log(`\nRun: pnpm dev:${shortcut}`)
