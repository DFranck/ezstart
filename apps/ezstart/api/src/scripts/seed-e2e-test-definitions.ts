/**
 * Seed script — bootstrap the initial E2E test definitions for the matrix.
 *
 * Idempotent: each definition is upserted by `testId`. Safe to re-run on every
 * deploy without duplicating rows; updates description/routes/files in place.
 *
 * Usage:
 *   pnpm --filter api-ezstart seed:e2e-tests
 *
 * Standard reference: `.claude/rules/standard-saas.md` (E2E coverage).
 */

import { connectToMongo } from '@ezstart/api-core'
import { loadSharedEnv } from '@ezstart/config/server'
import { getMongoUrl } from '@ezstart/config/env-resolvers'
import { getE2ETestDefinitionModel, type IE2ETestDefinition } from '../models/E2ETestDefinition.js'

type SeedDefinition = Omit<IE2ETestDefinition, 'createdAt' | 'updatedAt'>

/**
 * Initial registry of E2E tests. Keep this in sync with E2E-TESTS.md.
 *
 * Conventions:
 * - testId = `<app>.<category>.<feature-slug>` (lowercase, dots/dashes)
 * - filesExercised globs are relative to the monorepo root
 * - Priority defaults to P0 for happy-path public + auth flows
 */
const SEED: SeedDefinition[] = [
  // ───────── ezauth ─ public ─────────
  publicTest('ezauth', 'landing', 'Landing page renders', '/en'),
  publicTest('ezauth', 'docs', 'Docs index renders', '/en/docs'),
  publicTest('ezauth', 'docs-components', 'Docs components mirror loads', '/en/docs/components'),
  publicTest('ezauth', 'pricing', 'Pricing page renders + plans fetched', '/en/pricing'),
  publicTest('ezauth', 'about', 'About page renders', '/en/about'),
  publicTest('ezauth', 'contact', 'Contact page renders', '/en/contact'),
  publicTest('ezauth', 'privacy', 'Privacy policy renders', '/en/privacy'),
  publicTest('ezauth', 'terms', 'Terms of service renders', '/en/terms'),
  publicTest('ezauth', 'status', 'Status page renders', '/en/status'),
  publicTest('ezauth', 'login', 'Login page renders', '/en/login'),
  publicTest('ezauth', 'register', 'Register page renders', '/en/register'),
  publicTest('ezauth', 'forgot-password', 'Forgot-password page renders', '/en/forgot-password'),
  publicTest('ezauth', 'refund-policy', 'Refund policy renders', '/en/refund-policy', 'P1'),
  publicTest('ezauth', 'legal-notices', 'Legal notices render', '/en/legal-notices', 'P1'),
  publicTest('ezauth', 'blog', 'Blog index renders', '/en/blog', 'P1'),
  publicTest('ezauth', 'changelog', 'Changelog renders', '/en/changelog', 'P1'),
  publicTest('ezauth', 'security', 'Security page renders', '/en/security', 'P1'),

  // ───────── ezauth ─ auth ─────────
  authTest('ezauth', 'login-email', 'Email/password login flow'),
  authTest('ezauth', 'login-google', 'Google OAuth login flow'),
  authTest('ezauth', 'login-magic-link', 'Magic link login flow', 'P1'),
  authTest('ezauth', 'register', 'Email/password registration flow'),
  authTest('ezauth', 'forgot-password', 'Forgot-password email flow'),
  authTest('ezauth', 'reset-password', 'Reset-password landing flow'),
  authTest('ezauth', 'verify-email', 'Verify-email gate flow'),
  authTest('ezauth', 'logout', 'Logout end-to-end (server revoke + cross-tab)'),

  // ───────── ezauth ─ dashboard ─────────
  dashboardTest('ezauth', 'overview', 'Dashboard overview loads'),
  dashboardTest('ezauth', 'account', 'Account settings render'),
  dashboardTest('ezauth', 'developer', 'Developer portal (API keys CRUD)'),
  dashboardTest('ezauth', 'billing', 'Billing tab renders'),
  dashboardTest('ezauth', 'usage', 'Usage tab renders', 'P1'),
  dashboardTest('ezauth', 'activity', 'Activity / audit log renders', 'P1'),
  dashboardTest('ezauth', 'settings', 'Settings tab renders'),
  dashboardTest('ezauth', 'email-change', 'Email change verification flow', 'P1'),
  dashboardTest('ezauth', 'danger-zone', 'Account deletion (GDPR) flow'),

  // ───────── ezauth ─ admin ─────────
  adminTest('ezauth', 'overview', 'Admin overview renders'),
  adminTest('ezauth', 'users', 'Admin users CRUD'),
  adminTest('ezauth', 'applications', 'Admin applications CRUD'),
  adminTest('ezauth', 'settings', 'Admin platform settings'),
  adminTest('ezauth', '2fa-gate', '2FA mandatory gate for admins'),

  // ───────── ezauth ─ quality ─────────
  qualityDeprecationZero('ezauth', 'P0'),

  // ───────── ezpay ─ public ─────────
  publicTest('ezpay', 'landing', 'Landing page renders', '/en'),
  publicTest('ezpay', 'docs', 'Docs index renders', '/en/docs'),
  publicTest('ezpay', 'docs-components', 'Docs components mirror loads', '/en/docs/components'),
  publicTest('ezpay', 'pricing', 'Pricing page renders + plans fetched', '/en/pricing'),
  publicTest('ezpay', 'about', 'About page renders', '/en/about'),
  publicTest('ezpay', 'contact', 'Contact page renders', '/en/contact'),
  publicTest('ezpay', 'privacy', 'Privacy policy renders', '/en/privacy'),
  publicTest('ezpay', 'terms', 'Terms of service renders', '/en/terms'),
  publicTest('ezpay', 'status', 'Status page renders', '/en/status'),
  publicTest('ezpay', 'login', 'Login page renders', '/en/login'),
  publicTest('ezpay', 'security', 'Security page renders', '/en/security', 'P1'),
  publicTest('ezpay', 'refund-policy', 'Refund policy renders', '/en/refund-policy', 'P1'),
  publicTest('ezpay', 'blog', 'Blog index renders', '/en/blog', 'P1'),
  publicTest('ezpay', 'changelog', 'Changelog renders', '/en/changelog', 'P1'),

  // ───────── ezpay ─ auth ─────────
  {
    testId: 'ezpay.auth.login-sso',
    app: 'ezpay',
    feature: 'login-sso',
    category: 'auth',
    description: 'Single sign-on round-trip via ezauth',
    routesExercised: ['/en/login', '/en/auth/callback'],
    filesExercised: [
      'apps/ezpay/web/src/app/[locale]/login/**',
      'apps/ezpay/web/src/app/[locale]/auth/callback/**',
      'packages/auth-sdk/src/**',
    ],
    cadence: 'when-feature-touched',
    priority: 'P0',
  },

  // ───────── ezpay ─ dashboard ─────────
  dashboardTest('ezpay', 'overview', 'Dashboard overview loads'),
  dashboardTest('ezpay', 'account', 'Account settings render'),
  dashboardTest('ezpay', 'developer', 'Developer portal (API keys CRUD)'),
  dashboardTest('ezpay', 'billing', 'Billing tab renders'),
  dashboardTest('ezpay', 'usage', 'Usage tab renders', 'P1'),
  dashboardTest('ezpay', 'activity', 'Activity / audit log renders', 'P1'),
  dashboardTest('ezpay', 'settings', 'Settings tab renders'),
  dashboardTest('ezpay', 'plans', 'Plans CRUD renders'),

  // ───────── ezpay ─ flows ─────────
  flowTest('ezpay', 'subscribe', 'Stripe subscribe checkout end-to-end'),
  flowTest('ezpay', 'donate', 'Donation flow end-to-end'),
  flowTest('ezpay', 'purchase', 'One-time purchase flow', 'P1'),
  flowTest('ezpay', 'cancel-subscription', 'Cancel subscription flow'),
  flowTest('ezpay', 'update-payment-method', 'Update payment method flow'),
  flowTest('ezpay', 'download-invoice', 'Download invoice PDF', 'P1'),
  flowTest('ezpay', 'promo-code', 'Promo code apply flow', 'P1'),

  // ───────── ezpay ─ connect ─────────
  connectTest('ezpay', 'onboard', 'Stripe Connect onboarding'),
  connectTest('ezpay', 'dashboard', 'Connected account dashboard renders'),
  connectTest('ezpay', 'disconnect', 'Disconnect Stripe Connect account', 'P1'),

  // ───────── ezpay ─ admin ─────────
  adminTest('ezpay', 'overview', 'Admin overview renders'),
  adminTest('ezpay', 'payments', 'Admin payments view'),
  adminTest('ezpay', 'subscriptions', 'Admin subscriptions view'),
  adminTest('ezpay', 'plans', 'Admin plans CRUD'),
  adminTest('ezpay', 'promos', 'Admin promo codes CRUD', 'P1'),

  // ───────── ezpay ─ quality ─────────
  qualityDeprecationZero('ezpay', 'P0'),

  // ───────── ezstart ─ public ─────────
  publicTest('ezstart', 'landing', 'Landing page renders', '/en'),
  publicTest('ezstart', 'docs', 'Docs index renders', '/en/docs'),
  publicTest('ezstart', 'about', 'About page renders', '/en/about'),
  publicTest('ezstart', 'contact', 'Contact page renders', '/en/contact'),
  publicTest('ezstart', 'privacy', 'Privacy policy renders', '/en/privacy'),
  publicTest('ezstart', 'terms', 'Terms of service renders', '/en/terms'),
  publicTest('ezstart', 'login', 'Login page renders', '/en/login'),
  publicTest('ezstart', 'pricing', 'Pricing page renders', '/en/pricing'),
  publicTest('ezstart', 'blog', 'Blog index renders', '/en/blog', 'P1'),
  publicTest('ezstart', 'changelog', 'Changelog renders', '/en/changelog', 'P1'),
  publicTest('ezstart', 'status', 'Status page renders', '/en/status'),

  // ───────── ezstart ─ admin ─────────
  adminTest('ezstart', 'e2e-tests', 'E2E test matrix dashboard renders'),
  adminTest('ezstart', 'monitoring', 'Monitoring dashboard renders'),
  adminTest('ezstart', 'services', 'External provider services dashboard'),
  adminTest('ezstart', 'federated-auth-tab', 'Federated EZAuth admin tab loads'),
  adminTest('ezstart', 'federated-pay-tab', 'Federated EZPay admin tab loads'),

  // ───────── ezstart ─ quality ─────────
  qualityDeprecationZero('ezstart', 'P0'),

  // ───────── consumer apps ─ quality ─────────
  // No functional matrix entries yet for these apps (see BACKLOG), but the
  // deprecation-zero gate must already exist so any new SDK release that
  // introduces a deprecation surfaces as a `fail` row in the matrix without
  // waiting for the per-app coverage to land first.
  qualityDeprecationZero('ezbill', 'P1'),
  qualityDeprecationZero('green-pulse', 'P1'),
  qualityDeprecationZero('fengshui', 'P2'),
  qualityDeprecationZero('asc-tcd', 'P2'),
  qualityDeprecationZero('gacha-analyzer', 'P2'),
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function publicTest(
  app: SeedDefinition['app'],
  feature: string,
  description: string,
  route: string,
  priority: SeedDefinition['priority'] = 'P0'
): SeedDefinition {
  return {
    testId: `${app}.public.${feature}`,
    app,
    feature,
    category: 'public',
    description,
    routesExercised: [route],
    filesExercised: [
      `apps/${app}/web/src/app/[locale]${route === '/en' ? '/page.tsx' : `${route.replace(/^\/en/, '')}/**`}`,
      `apps/${app}/web/src/components/**`,
      'packages/ui/src/**',
    ],
    cadence: 'when-feature-touched',
    priority,
  }
}

function authTest(
  app: SeedDefinition['app'],
  feature: string,
  description: string,
  priority: SeedDefinition['priority'] = 'P0'
): SeedDefinition {
  return {
    testId: `${app}.auth.${feature}`,
    app,
    feature,
    category: 'auth',
    description,
    routesExercised: [
      `/en/${feature.startsWith('login') || feature === 'register' || feature === 'forgot-password' ? feature : `auth/${feature}`}`,
    ],
    filesExercised: [
      `apps/${app}/api/src/routes/auth/**`,
      `apps/${app}/web/src/app/[locale]/login/**`,
      `apps/${app}/web/src/app/[locale]/register/**`,
      `apps/${app}/web/src/app/[locale]/auth/**`,
      'packages/auth-sdk/src/**',
    ],
    cadence: 'when-feature-touched',
    priority,
  }
}

function dashboardTest(
  app: SeedDefinition['app'],
  feature: string,
  description: string,
  priority: SeedDefinition['priority'] = 'P0'
): SeedDefinition {
  return {
    testId: `${app}.dashboard.${feature}`,
    app,
    feature,
    category: 'dashboard',
    description,
    routesExercised: [`/en/dashboard/${feature === 'overview' ? '' : feature}`],
    filesExercised: [
      `apps/${app}/web/src/app/[locale]/(dashboard)/**`,
      `apps/${app}/web/src/app/[locale]/dashboard/**`,
      'packages/auth-sdk/src/components/**',
      'packages/pay-sdk/src/components/**',
    ],
    cadence: 'when-feature-touched',
    priority,
  }
}

function adminTest(
  app: SeedDefinition['app'],
  feature: string,
  description: string,
  priority: SeedDefinition['priority'] = 'P0'
): SeedDefinition {
  return {
    testId: `${app}.admin.${feature}`,
    app,
    feature,
    category: 'admin',
    description,
    routesExercised: [`/en/admin${feature === 'overview' ? '' : `/${feature}`}`],
    filesExercised: [
      `apps/${app}/api/src/routes/admin/**`,
      `apps/${app}/web/src/app/[locale]/(dashboard)/admin/**`,
      `apps/${app}/web/src/app/[locale]/admin/**`,
    ],
    cadence: 'when-feature-touched',
    priority,
  }
}

function flowTest(
  app: SeedDefinition['app'],
  feature: string,
  description: string,
  priority: SeedDefinition['priority'] = 'P0'
): SeedDefinition {
  return {
    testId: `${app}.flows.${feature}`,
    app,
    feature,
    category: 'flows',
    description,
    routesExercised: [`/en/dashboard/billing`, `/en/checkout`],
    filesExercised: [
      `apps/${app}/api/src/routes/payments/**`,
      `apps/${app}/api/src/routes/subscriptions/**`,
      `apps/${app}/api/src/routes/webhooks/**`,
      `apps/${app}/web/src/app/[locale]/checkout/**`,
      'packages/pay-sdk/src/**',
    ],
    cadence: 'when-feature-touched',
    priority,
  }
}

function connectTest(
  app: SeedDefinition['app'],
  feature: string,
  description: string,
  priority: SeedDefinition['priority'] = 'P0'
): SeedDefinition {
  return {
    testId: `${app}.connect.${feature}`,
    app,
    feature,
    category: 'connect',
    description,
    routesExercised: [`/en/dashboard/connect`],
    filesExercised: [
      `apps/${app}/api/src/routes/connect/**`,
      `apps/${app}/web/src/app/[locale]/(dashboard)/connect/**`,
      'packages/pay-sdk/src/**',
    ],
    cadence: 'when-feature-touched',
    priority,
  }
}

/**
 * Deprecation-zero quality gate (DEPRECATION-ZERO-QUALITY-GATE-001).
 *
 * Each `[DEPRECATED]` console warn surfaced by the runtime warning system
 * (`useDeprecationWarning` / `warnDeprecation` — cf. `standard-ui.md` §10) is
 * an implicit "needs migration" backlog item. An app is "100% pass" only when
 * ZERO deprecation warns appear across all its routes AND every functional
 * test passes.
 *
 * Routes are intentionally `['/']` — the test logically exercises all routes
 * of the app (not a single page). The agent navigates every route in the
 * matrix, aggregates console messages, and records the run as `pass` only
 * when the total count is zero.
 *
 * `filesExercised` covers the consuming app surface PLUS every SDK whose
 * deprecations might surface in that app — bumping any SDK can introduce or
 * fix a deprecation, so the gate must re-run on those changes too.
 */
function qualityDeprecationZero(
  app: SeedDefinition['app'],
  priority: SeedDefinition['priority'] = 'P0'
): SeedDefinition {
  return {
    testId: `${app}.quality.deprecation-zero`,
    app,
    feature: 'deprecation-zero',
    category: 'quality',
    description: '0 [DEPRECATED] console warns across all app routes',
    routesExercised: ['/'],
    filesExercised: [
      `apps/${app}/web/src/**`,
      'packages/auth-sdk/src/**',
      'packages/pay-sdk/src/**',
      'packages/ui/src/**',
    ],
    cadence: 'when-feature-touched',
    priority,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Result + core seed function
// ─────────────────────────────────────────────────────────────────────────────

export interface SeedE2ETestsResult {
  total: number
  inserted: number
  updated: number
}

/**
 * Idempotent upsert of every seed definition.
 *
 * Safe to call multiple times — `findOneAndUpdate({testId}, ..., {upsert})` is
 * the same write semantics used by the public POST /definitions handler.
 *
 * Exported for testability.
 */
export async function seedE2ETestDefinitions(
  defs: SeedDefinition[] = SEED
): Promise<SeedE2ETestsResult> {
  const Model = await getE2ETestDefinitionModel()
  let inserted = 0
  let updated = 0

  for (const d of defs) {
    const result = await Model.findOneAndUpdate(
      { testId: d.testId },
      {
        $set: {
          app: d.app,
          feature: d.feature,
          category: d.category,
          description: d.description,
          routesExercised: d.routesExercised,
          filesExercised: d.filesExercised,
          cadence: d.cadence,
          priority: d.priority,
        },
      },
      { upsert: true, new: false, setDefaultsOnInsert: true, includeResultMetadata: true }
    )

    if (result?.lastErrorObject?.updatedExisting) updated++
    else inserted++
  }

  return { total: defs.length, inserted, updated }
}

/**
 * CLI entry point. Connects to MongoDB, seeds definitions, prints a summary.
 */
async function main(): Promise<void> {
  loadSharedEnv({ app: 'ezstart', layer: 'api' })
  process.env.MONGO_URL = getMongoUrl('ezstart')
  await connectToMongo('ezstart')

  const result = await seedE2ETestDefinitions()

  console.info('')
  console.info('✅ E2E test definitions seeded')
  console.info(`   Total: ${result.total}`)
  console.info(`   Inserted: ${result.inserted}`)
  console.info(`   Updated:  ${result.updated}`)
  console.info('')
  process.exit(0)
}

const invokedAsScript = (() => {
  const entry = process.argv[1]
  if (!entry) return false
  const entryUrl = new URL(`file://${entry.replace(/\\/g, '/')}`).href
  return entryUrl === import.meta.url
})()

if (invokedAsScript) {
  main().catch(err => {
    console.error('seed-e2e-test-definitions failed:', err)
    process.exit(1)
  })
}
