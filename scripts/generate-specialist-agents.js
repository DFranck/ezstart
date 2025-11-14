#!/usr/bin/env node
/**
 * Generate Specialist Agents from template
 *
 * Usage: node scripts/generate-specialist-agents.js
 *
 * Generates 17 specialist agents from TEMPLATE-SPECIALIST-AGENT.md
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration des agents à générer
const agents = [
  {
    name: 'Architecture',
    slug: 'architecture',
    score: 95,
    audit: 'ARCHITECTURE-AUDIT.md',
    packages: ['@ezstart/express-core', '@ezstart/auth-sdk', '@ezstart/pay-sdk', '@ezstart/rbac', '@ezstart/ui'],
    apps: ['All 8 web + 6 API apps'],
    files: ['apps/*/api/src/routes/', 'apps/*/api/src/actions/', 'packages/*/src/'],
    priority: 'High',
    standards: ['Action-based routing', 'Clean Architecture', 'SOLID principles', 'Dependency Injection'],
    bestPractices: ['1 file = 1 action', 'Router → Action → Service → Model', 'Thin controllers', 'Fat models'],
    tools: ['TypeScript', 'Express.js', 'Zod validation'],
    criticalCriteria: ['Action-based routing in all APIs', 'Clean dependency graph', 'No circular dependencies'],
    highCriteria: ['Consistent error handling', 'Proper separation of concerns', 'Shared code in packages'],
  },
  {
    name: 'Performance',
    slug: 'performance',
    score: 82,
    audit: 'PERFORMANCE-AUDIT.md',
    packages: ['@ezstart/monitoring', '@ezstart/ui', '@ezstart/next-config'],
    apps: ['All 8 web apps'],
    files: ['apps/*/web/src/app/', 'apps/*/web/next.config.js', 'packages/ui/'],
    priority: 'High',
    standards: ['Core Web Vitals', 'Lighthouse scores', 'Bundle size <200KB', 'TTFB <200ms'],
    bestPractices: ['Code splitting', 'Image optimization', 'Lazy loading', 'Caching strategies'],
    tools: ['Next.js Image', 'next-bundle-analyzer', 'Lighthouse CI', '@ezstart/monitoring'],
    criticalCriteria: ['LCP <2.5s', 'FID <100ms', 'CLS <0.1', 'Bundle <200KB'],
    highCriteria: ['WebP/AVIF images', 'Route-based code splitting', 'API response <500ms'],
  },
  {
    name: 'Security',
    slug: 'security',
    score: 88,
    audit: 'SECURITY-AUDIT.md',
    packages: ['@ezstart/auth-sdk', '@ezstart/rbac', '@ezstart/express-core'],
    apps: ['All APIs + EZAuth app'],
    files: ['packages/auth-sdk/', 'apps/*/api/src/middleware/', '.env.example files'],
    priority: 'High',
    standards: ['OWASP Top 10', 'JWT best practices', 'CORS policies', 'Rate limiting'],
    bestPractices: ['HttpOnly cookies', 'CSRF protection', 'Input validation', 'Helmet.js'],
    tools: ['@ezstart/auth-sdk', '@ezstart/rbac', 'helmet', 'express-rate-limit'],
    criticalCriteria: ['No secrets in code', 'HTTPS everywhere', 'Authentication on protected routes', 'RBAC enforced'],
    highCriteria: ['Rate limiting on APIs', 'Input sanitization', 'SQL injection prevention', 'XSS protection'],
  },
  {
    name: 'Testing',
    slug: 'testing',
    score: 100,
    audit: 'TESTING-AUDIT.md',
    packages: ['@ezstart/test-utils', 'All packages with tests'],
    apps: ['All apps'],
    files: ['**/*.test.ts', '**/*.test.tsx', 'vitest.config.ts files'],
    priority: 'Medium',
    standards: ['Vitest', 'Testing Library', '80%+ coverage', 'Unit + Integration tests'],
    bestPractices: ['Test isolation', 'Mock external dependencies', 'Database protection', 'Fast tests'],
    tools: ['Vitest', '@testing-library/react', '@ezstart/test-utils', 'supertest'],
    criticalCriteria: ['All APIs have tests', 'Critical paths covered', 'CI/CD integration', 'Database isolation'],
    highCriteria: ['80%+ coverage', 'E2E tests for critical flows', 'Performance tests'],
  },
  {
    name: 'Infrastructure',
    slug: 'infrastructure',
    score: 82,
    audit: 'INFRASTRUCTURE-AUDIT.md',
    packages: ['@ezstart/config', '@ezstart/logger'],
    apps: ['All deployed apps'],
    files: ['docker-compose.yml', 'nginx/', 'scripts/oracle-*.sh', '.env.oracle'],
    priority: 'High',
    standards: ['Docker', 'Oracle Cloud', 'Nginx', 'CI/CD', 'Secrets management'],
    bestPractices: ['Infrastructure as Code', 'Multi-stage builds', 'Health checks', 'Automated backups'],
    tools: ['Docker', 'Oracle Cloud', 'Nginx', 'GitHub Actions'],
    criticalCriteria: ['All APIs dockerized', 'Oracle deployment working', 'SSL configured', 'Backups automated'],
    highCriteria: ['CI/CD pipeline', 'Monitoring integrated', 'Log aggregation', 'Disaster recovery plan'],
  },
  {
    name: 'Monitoring',
    slug: 'monitoring',
    score: 100,
    audit: 'MONITORING-AUDIT.md',
    packages: ['@ezstart/monitoring', '@ezstart/logger'],
    apps: ['EZStart monitoring dashboard', 'All APIs'],
    files: ['packages/monitoring/', 'apps/ezstart/api/', 'apps/*/api/src/middleware/'],
    priority: 'Medium',
    standards: ['APM', 'Plausible Analytics', 'Error tracking', 'Performance metrics'],
    bestPractices: ['p50/p95/p99 metrics', 'Real-time dashboards', 'Alert thresholds', 'Privacy-first analytics'],
    tools: ['@ezstart/monitoring', 'Plausible', 'Recharts', 'Winston logger'],
    criticalCriteria: ['APM on all APIs', 'Analytics on all web apps', 'Error logging', 'Performance tracking'],
    highCriteria: ['Trending graphs', 'Email alerts', 'SLA monitoring', 'Custom metrics'],
  },
  {
    name: 'API',
    slug: 'api',
    score: 100,
    audit: 'API-AUDIT.md',
    packages: ['@ezstart/express-core', '@ezstart/auth-sdk', '@ezstart/pay-sdk'],
    apps: ['All 6 API apps'],
    files: ['apps/*/api/src/', 'apps/*/api/docs/'],
    priority: 'Medium',
    standards: ['RESTful', 'Action-based routing', 'Zod validation', 'Error handling'],
    bestPractices: ['Consistent response format', 'Versioning strategy', 'Rate limiting', 'OpenAPI docs'],
    tools: ['Express.js', '@ezstart/express-core', 'Zod', 'Swagger/OpenAPI'],
    criticalCriteria: ['Action-based routing', 'Input validation', 'Error handling', 'Authentication'],
    highCriteria: ['OpenAPI documentation', 'Rate limiting', 'CORS configured', 'Logging'],
  },
  {
    name: 'UX',
    slug: 'ux',
    score: 96,
    audit: 'UX-AUDIT.md',
    packages: ['@ezstart/ui'],
    apps: ['All 8 web apps'],
    files: ['packages/ui/', 'apps/*/web/src/components/', 'apps/*/web/src/app/'],
    priority: 'Medium',
    standards: ['Design System', 'Consistent UI', 'Loading states', 'Error feedback'],
    bestPractices: ['Welcome modals', 'Progress indicators', 'Toasts', 'Empty states'],
    tools: ['@ezstart/ui', 'Tailwind CSS', 'Radix UI', 'next-themes'],
    criticalCriteria: ['Design system usage', 'Loading states everywhere', 'Error handling UI', 'Responsive design'],
    highCriteria: ['Welcome modals', 'Progress bars', 'Skeleton loaders', 'Optimistic updates'],
  },
  {
    name: 'Mobile UX',
    slug: 'mobile-ux',
    score: 93,
    audit: 'MOBILE-UX-AUDIT.md',
    packages: ['@ezstart/ui'],
    apps: ['All 8 web apps'],
    files: ['packages/ui/', 'apps/*/web/tailwind.config.js'],
    priority: 'Medium',
    standards: ['Responsive design', 'Touch-friendly', 'Safe-area support', 'Mobile-first'],
    bestPractices: ['44px+ touch targets', 'Bottom navigation', 'Swipe gestures', 'iPhone notch support'],
    tools: ['Tailwind CSS responsive classes', 'safe-area CSS', '@ezstart/ui mobile components'],
    criticalCriteria: ['100% responsive', 'Safe-area support', 'Touch targets 44px+', 'Mobile nav'],
    highCriteria: ['Swipe gestures', 'Pull-to-refresh', 'Bottom sheets', 'Mobile-optimized forms'],
  },
  {
    name: 'Accessibility',
    slug: 'accessibility',
    score: 95,
    audit: 'ACCESSIBILITY-AUDIT.md',
    packages: ['@ezstart/ui'],
    apps: ['All 8 web apps'],
    files: ['packages/ui/src/components/', 'apps/*/web/src/'],
    priority: 'Medium',
    standards: ['WCAG 2.1 AA', 'ARIA attributes', 'Keyboard navigation', 'Screen reader support'],
    bestPractices: ['Semantic HTML', 'Alt text', 'Focus management', 'Color contrast'],
    tools: ['Radix UI (a11y built-in)', '@ezstart/ui', 'axe-core', 'Lighthouse'],
    criticalCriteria: ['Semantic HTML', 'Keyboard navigation', 'Alt text on images', 'Color contrast 4.5:1'],
    highCriteria: ['ARIA labels', 'Focus indicators', 'Screen reader tested', 'Skip links'],
  },
  {
    name: 'Code Quality',
    slug: 'code-quality',
    score: 92,
    audit: 'CODE-QUALITY-AUDIT.md',
    packages: ['@ezstart/eslint-config', '@ezstart/typescript-config'],
    apps: ['All packages and apps'],
    files: ['**/*.ts', '**/*.tsx', 'eslint.config.js', 'tsconfig.json'],
    priority: 'Medium',
    standards: ['ESLint', 'TypeScript strict', 'Prettier', 'No any'],
    bestPractices: ['Type safety', 'Consistent formatting', 'Code reviews', 'Linting CI'],
    tools: ['ESLint', 'TypeScript', 'Prettier', '@ezstart/eslint-config'],
    criticalCriteria: ['No TypeScript errors', 'ESLint passing', 'No any types', 'Consistent formatting'],
    highCriteria: ['Strict mode enabled', 'Complex types documented', 'Code comments where needed'],
  },
  {
    name: 'Documentation',
    slug: 'documentation',
    score: 95,
    audit: 'DOCUMENTATION-AUDIT.md',
    packages: ['All packages'],
    apps: ['All apps'],
    files: ['docs/', '*/README.md', '*/CHANGELOG.md', 'CLAUDE.md', 'DEV-RULES.md'],
    priority: 'Medium',
    standards: ['README per package', 'API documentation', 'Guides', 'Architecture docs'],
    bestPractices: ['Keep docs updated', 'Examples', 'Diagrams', 'Changelogs'],
    tools: ['Markdown', 'JSDoc', 'OpenAPI/Swagger', 'Mermaid diagrams'],
    criticalCriteria: ['README in all packages', 'CLAUDE.md up-to-date', 'DEV-RULES.md complete', 'Guides exist'],
    highCriteria: ['API docs (OpenAPI)', 'Architecture diagrams', 'Migration guides', 'Examples'],
  },
  {
    name: 'Dependencies',
    slug: 'dependencies',
    score: 90,
    audit: 'DEPENDENCIES-AUDIT.md',
    packages: ['All packages'],
    apps: ['All apps'],
    files: ['package.json', 'pnpm-lock.yaml'],
    priority: 'Medium',
    standards: ['pnpm', 'Workspace protocol', 'Renovate', 'Security audits'],
    bestPractices: ['Regular updates', 'Security patches', 'Minimal deps', 'Monorepo deps management'],
    tools: ['pnpm', 'Renovate', 'npm audit', 'depcheck'],
    criticalCriteria: ['No security vulnerabilities', 'Workspace protocol used', 'No duplicate deps'],
    highCriteria: ['Dependencies up-to-date', 'Unused deps removed', 'License compliance'],
  },
  {
    name: 'SEO',
    slug: 'seo',
    score: 85,
    audit: 'SEO-AUDIT.md',
    packages: ['@ezstart/next-config'],
    apps: ['All 8 web apps'],
    files: ['apps/*/web/src/app/layout.tsx', 'apps/*/web/public/', 'apps/*/web/src/app/sitemap.ts'],
    priority: 'Medium',
    standards: ['Next.js Metadata API', 'Sitemap', 'Robots.txt', 'Structured data'],
    bestPractices: ['Meta tags', 'OpenGraph', 'Canonical URLs', 'Image alt text'],
    tools: ['Next.js Metadata', 'next-sitemap', 'Google Search Console', 'Lighthouse'],
    criticalCriteria: ['Title/description on all pages', 'Sitemap.xml', 'Robots.txt', 'Mobile-friendly'],
    highCriteria: ['OpenGraph tags', 'Structured data (JSON-LD)', 'Canonical URLs', 'Hreflang tags'],
  },
  {
    name: 'Web Apps',
    slug: 'web-apps',
    score: 90,
    audit: 'WEB-APPS-AUDIT.md',
    packages: ['@ezstart/ui', '@ezstart/auth-sdk', '@ezstart/next-config'],
    apps: ['All 8 web apps'],
    files: ['apps/*/web/'],
    priority: 'Medium',
    standards: ['Next.js 15', 'React 19', 'next-intl', 'Tailwind'],
    bestPractices: ['App Router', 'Server Components', 'Client Components where needed', 'Proper data fetching'],
    tools: ['Next.js', 'React', 'next-intl', 'Tailwind CSS'],
    criticalCriteria: ['Next.js 15', 'App Router', 'i18n configured', 'Authentication'],
    highCriteria: ['Server Components by default', 'Proper loading states', 'Error boundaries', 'Metadata'],
  },
  {
    name: 'Landing Pages',
    slug: 'landing-pages',
    score: 90,
    audit: 'LANDING-PAGES-AUDIT.md',
    packages: ['@ezstart/ui'],
    apps: ['EZStart, GreenPulse, FengShui landing pages'],
    files: ['apps/ezstart/web/src/app/[locale]/page.tsx', 'apps/green-pulse/web/src/app/[locale]/page.tsx'],
    priority: 'Medium',
    standards: ['Hero section', 'Value props', 'CTA', 'Social proof'],
    bestPractices: ['Above-the-fold CTA', 'Clear value prop', 'Trust indicators', 'Mobile-first'],
    tools: ['@ezstart/ui', 'next-themes', 'Radix UI'],
    criticalCriteria: ['Hero with CTA', 'Clear value proposition', 'Features section', 'Mobile responsive'],
    highCriteria: ['Social proof', 'FAQ', 'Pricing', 'Trust badges'],
  },
  {
    name: 'Databases',
    slug: 'databases',
    score: 100,
    audit: 'DATABASES-AUDIT.md',
    packages: ['@ezstart/express-core'],
    apps: ['All 6 API apps'],
    files: ['apps/*/api/src/models/', 'packages/express-core/src/mongo.ts'],
    priority: 'Low',
    standards: ['MongoDB', 'Mongoose', 'Factory functions', 'Connection pooling'],
    bestPractices: ['Centralized connection', 'Model factories', 'Database isolation in tests', 'Indexes'],
    tools: ['MongoDB', 'Mongoose', '@ezstart/express-core'],
    criticalCriteria: ['Centralized connection', 'Factory functions', 'Test isolation', 'Connection pooling'],
    highCriteria: ['Proper indexes', 'Schema validation', 'Migration scripts', 'Backups'],
  },
]

// Fonction pour générer un agent
function generateAgent(agent, template) {
  let content = template

  // Remplacements simples
  content = content.replaceAll('[DOMAIN_NAME]', agent.name)
  content = content.replaceAll('[DOMAIN]', agent.slug)
  content = content.replaceAll('[XX]', agent.score.toString())
  content = content.replaceAll('DOMAIN-AUDIT.md', agent.audit)

  // Remplacements de listes
  content = content.replaceAll(
    '[LIST_STANDARDS]',
    agent.standards.map((s, i) => `${i + 1}. **${s}**`).join('\n')
  )
  content = content.replaceAll(
    '[LIST_BEST_PRACTICES]',
    agent.bestPractices.map((p, i) => `${i + 1}. ${p}`).join('\n')
  )
  content = content.replaceAll(
    '[LIST_TOOLS]',
    agent.tools.map((t, i) => `${i + 1}. \`${t}\``).join('\n')
  )

  // Remplacements de critères
  content = content.replaceAll(
    '[CRITERIA_1]',
    agent.criticalCriteria[0] || 'Critical criteria 1'
  )
  content = content.replaceAll(
    '[CRITERIA_2]',
    agent.criticalCriteria[1] || 'Critical criteria 2'
  )
  content = content.replaceAll(
    '[CRITERIA_3]',
    agent.criticalCriteria[2] || 'Critical criteria 3'
  )
  content = content.replaceAll(
    '[CRITERIA_4]',
    agent.highCriteria[0] || 'High priority criteria 1'
  )
  content = content.replaceAll(
    '[CRITERIA_5]',
    agent.highCriteria[1] || 'High priority criteria 2'
  )

  // Section Périmètre
  const perimetre = `
**Périmètre:**
- **Packages:** ${agent.packages.join(', ')}
- **Apps:** ${agent.apps.join(', ')}
- **Fichiers clés:** \`${agent.files.join('`, `')}\`
`
  content = content.replace(
    /\*\*Périmètre:\*\*[\s\S]*?---/,
    `**Périmètre:**${perimetre}\n---`
  )

  return content
}

// Main
function main() {
  const templatePath = path.join(__dirname, '../.claude/missions/TEMPLATE-SPECIALIST-AGENT.md')
  const outputDir = path.join(__dirname, '../.claude/missions')

  if (!fs.existsSync(templatePath)) {
    console.error('❌ Template not found:', templatePath)
    process.exit(1)
  }

  const template = fs.readFileSync(templatePath, 'utf8')

  console.log('🤖 Generating Specialist Agents...\n')

  let generated = 0
  let skipped = 0

  agents.forEach((agent) => {
    const filename = path.join(outputDir, `${agent.slug}-specialist.md`)

    // Skip if already exists
    if (fs.existsSync(filename)) {
      console.log(`⏭️  Skipped (exists): ${agent.slug}-specialist.md`)
      skipped++
      return
    }

    const content = generateAgent(agent, template)
    fs.writeFileSync(filename, content, 'utf8')
    console.log(`✅ Generated: ${agent.slug}-specialist.md (Score: ${agent.score}/100)`)
    generated++
  })

  console.log(`\n🎉 Done!`)
  console.log(`   Generated: ${generated} agents`)
  console.log(`   Skipped: ${skipped} agents (already exist)`)
  console.log(`   Total: ${agents.length} agents`)
  console.log(`\n📁 Location: .claude/missions/`)
  console.log(`📖 Documentation: .claude/missions/README.md`)
}

main()
