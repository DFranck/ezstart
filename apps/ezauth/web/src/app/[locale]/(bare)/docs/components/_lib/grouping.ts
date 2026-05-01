/**
 * Showcase domain grouping + variant detection.
 *
 * The auth-sdk component registry exposes ~50 components grouped by file-system
 * categories (Forms, Modals, Misc, OAuth, Buttons, Admin, ...). That structure
 * mirrors the source tree but is too granular for a developer-facing showcase.
 *
 * This module re-projects the registry into:
 *
 * - **8 domain groups** (Auth Forms / Auth Buttons / User Profile / Dashboards
 *   / Applications & Keys / Guards & Banners / Security / Audit) — used as
 *   the landing page sections + sidebar headings.
 * - **Feature groups** (SignIn / SignUp / ForgotPassword / ResetPassword /
 *   VerifyEmail) — collapse `XForm` + `XCard` + `XModal` triplets into a
 *   single entry that renders Tabs at the detail level.
 * - **Internal/shell exclusions** — `AuthCardShell` / `AuthModalShell` are
 *   building blocks used inside the variant components, never consumed
 *   directly. Filter them.
 *
 * The grouping is deliberately consumer-side (this directory) and never
 * leaks back into `@ezstart/auth-sdk`. Downstream consumers (third-party
 * apps, AI agents, future Stripe-style docs portal) can re-use the raw
 * registry without inheriting our editorial choices.
 */

import type { ComponentEntry } from '@ezstart/auth-sdk/components/registry'

/** High-level domain shown on the showcase landing page. */
export type DomainKey =
  | 'authForms'
  | 'authButtons'
  | 'userProfile'
  | 'dashboards'
  | 'applicationsKeys'
  | 'guardsBanners'
  | 'security'
  | 'audit'

export interface Domain {
  key: DomainKey
  /** i18n key under `components.domain.<key>.title` */
  i18nKey: string
}

/** Ordered list — matches the order rendered on the landing page + sidebar. */
export const DOMAINS: Domain[] = [
  { key: 'authForms', i18nKey: 'authForms' },
  { key: 'authButtons', i18nKey: 'authButtons' },
  { key: 'userProfile', i18nKey: 'userProfile' },
  { key: 'dashboards', i18nKey: 'dashboards' },
  { key: 'applicationsKeys', i18nKey: 'applicationsKeys' },
  { key: 'guardsBanners', i18nKey: 'guardsBanners' },
  { key: 'security', i18nKey: 'security' },
  { key: 'audit', i18nKey: 'audit' },
]

/**
 * Manual mapping `componentName → domain`. Drives BOTH the landing
 * sections and the sidebar tree. Components not listed here are dropped
 * from the showcase (acts as the "internal-only" filter today, until
 * the registry generator surfaces an `isInternal` flag — see #153).
 */
const COMPONENT_TO_DOMAIN: Record<string, DomainKey> = {
  // Auth Forms
  SignInForm: 'authForms',
  SignInCard: 'authForms',
  SignInModal: 'authForms',
  SignUpForm: 'authForms',
  SignUpCard: 'authForms',
  SignUpModal: 'authForms',
  QuickSignUpForm: 'authForms',
  ForgotPasswordForm: 'authForms',
  ForgotPasswordCard: 'authForms',
  ForgotPasswordModal: 'authForms',
  ResetPasswordForm: 'authForms',
  ResetPasswordCard: 'authForms',
  ResetPasswordModal: 'authForms',
  VerifyEmailFlow: 'authForms',
  VerifyEmailCard: 'authForms',
  VerifyEmailModal: 'authForms',
  MagicLinkForm: 'authForms',
  EmailChangeForm: 'authForms',

  // Auth Buttons
  LoginButton: 'authButtons',
  RegisterButton: 'authButtons',
  OAuthButtons: 'authButtons',
  MagicLinkButton: 'authButtons',

  // User Profile
  UserMenu: 'userProfile',
  UserMenuV2: 'userProfile',
  UserAvatar: 'userProfile',
  UserSettings: 'userProfile',
  AccountModal: 'userProfile',
  AccountModalV2: 'userProfile',
  SessionsManager: 'userProfile',
  EmailVerificationStatus: 'userProfile',
  OAuthProvidersSection: 'userProfile',
  DeleteAccountSection: 'userProfile',

  // Dashboards
  EZAuthDashboard: 'dashboards',
  AuthAdminDashboard: 'dashboards',
  UserDashboard: 'dashboards',
  AuthCallbackPage: 'dashboards',

  // Applications & Keys
  ApplicationsList: 'applicationsKeys',
  ApplicationCard: 'applicationsKeys',
  ApplicationDetailView: 'applicationsKeys',
  CreateApplicationModal: 'applicationsKeys',
  DeveloperPortal: 'applicationsKeys',
  ApiKeysTable: 'applicationsKeys',
  CreateKeyModal: 'applicationsKeys',
  KeyCreatedModal: 'applicationsKeys',
  UsageBadge: 'applicationsKeys',
  UsageDetailsModal: 'applicationsKeys',

  // Guards & Banners
  RequireEmailVerified: 'guardsBanners',
  RequireAuthLoader: 'guardsBanners',
  EmailVerificationBanner: 'guardsBanners',
  MaintenanceBanner: 'guardsBanners',
  DevModeBanner: 'guardsBanners',
  AuthErrorBanner: 'guardsBanners',
  ScopeContextIndicator: 'guardsBanners',

  // Security
  PasswordStrength: 'security',
  TurnstileWidget: 'security',
  TwoFactorSettings: 'security',
  TwoFactorPrompt: 'security',

  // Audit
  AuditLogSection: 'audit',

  // Internal shells — `@internal` tagged, hidden by default. Surfaced
  // alongside the variant components when the admin "Show internal" toggle
  // is enabled (DOCS-COMPONENTS-ADMIN-INTERNAL-TOGGLE-001).
  AuthCardShell: 'authForms',
  AuthModalShell: 'authForms',
}

/**
 * Components explicitly hidden from the showcase, regardless of the
 * "Show internal" admin toggle. Use sparingly — this is for components
 * that have no UI surface (utility wrappers, render-prop guards) and
 * should not appear in the docs even for superadmins.
 *
 * The `@internal` shells (`AuthCardShell`, `AuthModalShell`) are NOT
 * listed here — they are gated by the per-entry `isInternal` flag from
 * the registry generator and revealed via the admin toggle.
 */
const HIDDEN_COMPONENTS = new Set<string>(['SignedIn', 'SignedOut'])

/**
 * Folder-bucket category names from the registry that should NEVER be
 * surfaced as standalone categories on the new docs landing — they're
 * faux-positives produced by the file-system-driven generator (folded
 * into domains via `COMPONENT_TO_DOMAIN`).
 *
 * Defensive: exposed so legacy code paths can short-circuit on these
 * names if they ever leak into a UI dropdown.
 */
export const FOLDER_BUCKET_CATEGORIES = new Set<string>([
  'Admin',
  'Buttons',
  'Forms',
  'Modals',
  'OAuth',
  'Sessions',
  'Misc',
  'Password',
  'Two-Factor',
  'Email Verification',
  'Banners & Loaders',
  'Audit & Danger',
  'Applications',
  'Developer Portal',
  'Dashboards',
  'User Identity',
  'User Identity (V2)',
])

/**
 * A "feature group" collapses sibling variants of the same primitive
 * into one showcase entry (e.g. `SignIn` = `SignInForm` + `SignInCard`
 * + `SignInModal`). The detail page shows Tabs to switch between
 * variants without polluting the landing with 3× the entries.
 */
export interface FeatureGroup {
  /** Slug used in the URL (e.g. `'sign-in'`). */
  slug: string
  /** Display name (e.g. `'Sign In'`). */
  name: string
  /** Variant entries — keys are the variant labels (`'Form'`, `'Card'`, `'Modal'`, ...). */
  variants: Array<{ label: string; entry: ComponentEntry }>
}

/**
 * Manual feature definitions. Each declares the variant order
 * (Form → Card → Modal → Flow) so the Tabs always render the lightest
 * primitive first.
 */
const FEATURE_DEFINITIONS: Array<{
  slug: string
  name: string
  variants: Array<{ label: string; component: string }>
}> = [
  {
    slug: 'sign-in',
    name: 'Sign In',
    variants: [
      { label: 'Form', component: 'SignInForm' },
      { label: 'Card', component: 'SignInCard' },
      { label: 'Modal', component: 'SignInModal' },
    ],
  },
  {
    slug: 'sign-up',
    name: 'Sign Up',
    variants: [
      { label: 'Form', component: 'SignUpForm' },
      { label: 'Card', component: 'SignUpCard' },
      { label: 'Modal', component: 'SignUpModal' },
    ],
  },
  {
    slug: 'forgot-password',
    name: 'Forgot Password',
    variants: [
      { label: 'Form', component: 'ForgotPasswordForm' },
      { label: 'Card', component: 'ForgotPasswordCard' },
      { label: 'Modal', component: 'ForgotPasswordModal' },
    ],
  },
  {
    slug: 'reset-password',
    name: 'Reset Password',
    variants: [
      { label: 'Form', component: 'ResetPasswordForm' },
      { label: 'Card', component: 'ResetPasswordCard' },
      { label: 'Modal', component: 'ResetPasswordModal' },
    ],
  },
  {
    slug: 'verify-email',
    name: 'Verify Email',
    variants: [
      { label: 'Flow', component: 'VerifyEmailFlow' },
      { label: 'Card', component: 'VerifyEmailCard' },
      { label: 'Modal', component: 'VerifyEmailModal' },
    ],
  },
]

/**
 * One landing entry — either a single component card or a feature
 * group (variants collapsed under one entry with Tabs at detail
 * level).
 */
export type ShowcaseEntry =
  | { kind: 'single'; entry: ComponentEntry }
  | { kind: 'feature'; group: FeatureGroup }

export interface DomainSection {
  key: DomainKey
  /** All renderable entries for this domain (singles + feature groups). */
  entries: ShowcaseEntry[]
  /** Total component count (variants counted individually). */
  componentCount: number
}

/**
 * Build the full showcase tree from the raw registry. Filters internal
 * shells, optionally filters `@internal`-tagged entries, projects into
 * 8 domains, and collapses variant triplets into feature groups.
 */
export function buildShowcaseTree(
  registry: readonly ComponentEntry[],
  options: { showInternal?: boolean } = {}
): DomainSection[] {
  const { showInternal = false } = options

  // 1. Index entries by name for O(1) lookup.
  const byName = new Map<string, ComponentEntry>()
  for (const entry of registry) {
    byName.set(entry.name, entry)
  }

  // 2. Resolve feature groups + collect the variant component names so
  //    they can be excluded from the "singles" pass.
  const featureGroups = new Map<string, FeatureGroup>()
  const consumedByFeature = new Set<string>()
  for (const def of FEATURE_DEFINITIONS) {
    const variants: FeatureGroup['variants'] = []
    for (const v of def.variants) {
      const entry = byName.get(v.component)
      if (entry) {
        variants.push({ label: v.label, entry })
        consumedByFeature.add(v.component)
      }
    }
    if (variants.length > 0) {
      featureGroups.set(def.slug, { slug: def.slug, name: def.name, variants })
    }
  }

  // 3. Bucket every visible entry into its domain.
  const domainBuckets = new Map<DomainKey, ShowcaseEntry[]>()
  for (const d of DOMAINS) {
    domainBuckets.set(d.key, [])
  }

  // 3a. Place feature groups into their domain (use the first variant's
  //     domain — variants are always in the same domain by construction).
  for (const group of featureGroups.values()) {
    const first = group.variants[0]
    if (!first) continue
    const domain = COMPONENT_TO_DOMAIN[first.entry.name]
    if (!domain) continue
    domainBuckets.get(domain)!.push({ kind: 'feature', group })
  }

  // 3b. Place remaining singles.
  for (const entry of registry) {
    if (consumedByFeature.has(entry.name)) continue
    if (HIDDEN_COMPONENTS.has(entry.name)) continue
    if (!showInternal && isInternalEntry(entry)) continue

    const domain = COMPONENT_TO_DOMAIN[entry.name]
    if (!domain) continue
    domainBuckets.get(domain)!.push({ kind: 'single', entry })
  }

  // 4. Assemble + count.
  const sections: DomainSection[] = []
  for (const d of DOMAINS) {
    const entries = domainBuckets.get(d.key) ?? []
    if (entries.length === 0) continue
    // Sort: features first (by slug), then singles by component name.
    entries.sort((a, b) => {
      if (a.kind === 'feature' && b.kind === 'feature') {
        return a.group.name.localeCompare(b.group.name)
      }
      if (a.kind === 'feature') return -1
      if (b.kind === 'feature') return 1
      return a.entry.name.localeCompare(b.entry.name)
    })

    const componentCount = entries.reduce((acc, e) => {
      return acc + (e.kind === 'feature' ? e.group.variants.length : 1)
    }, 0)

    sections.push({ key: d.key, entries, componentCount })
  }
  return sections
}

/**
 * Detect `@internal` markers in a registry entry. Authoritative source is
 * the `isInternal` boolean produced by the registry generator (set when
 * the component declaration is preceded by an `@internal` TSDoc tag — see
 * `packages/auth-sdk/scripts/generate-registry.cjs`). The text fallback is
 * a defensive guard for older generated registries that predate the flag.
 */
function isInternalEntry(entry: ComponentEntry): boolean {
  if (entry.isInternal === true) return true
  const haystack = `${entry.summary} ${entry.description}`.toLowerCase()
  return haystack.includes('@internal')
}

/**
 * Slug helpers for the new feature-grouped routes. Singles still use the
 * existing `/docs/components/<category-slug>/<component-slug>` route
 * (handled by the `[category]/[component]` page). Feature groups can be
 * linked via `/docs/components/<category-slug>/<feature-slug>` once the
 * detail page learns to resolve features (follow-up). For now the
 * landing's "feature" cards link to the first variant's existing route
 * so all links resolve to a real page.
 */
export function featureFallbackComponentName(group: FeatureGroup): string {
  return group.variants[0]?.entry.name ?? ''
}
