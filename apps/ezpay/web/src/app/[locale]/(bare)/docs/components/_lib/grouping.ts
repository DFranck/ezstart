/**
 * Showcase domain grouping for the pay-sdk component registry.
 *
 * The pay-sdk registry exposes ~40 components grouped by file-system
 * categories (Donations, Subscriptions, Billing, Connect, ...). That
 * structure mirrors the source tree and is acceptable, but for a
 * developer-facing showcase we re-project it into 8 high-level domains
 * that match how a consumer thinks about the product surface (donations,
 * subscriptions, billing & pricing, marketplace purchases, callback
 * pages, Stripe Connect, admin/developer tooling, and orthogonal
 * utilities/gates).
 *
 * Mirror of `apps/ezauth/web/src/app/[locale]/(bare)/docs/components/_lib/grouping.ts`
 * with pay-sdk-specific domain mapping. The grouping is deliberately
 * consumer-side (this directory) and never leaks back into
 * `@ezstart/pay-sdk`.
 */

import type { ComponentEntry } from '@ezstart/pay-sdk/components/registry'

/** High-level domain shown on the showcase landing page. */
export type DomainKey =
  | 'donations'
  | 'subscriptions'
  | 'billingPricing'
  | 'purchases'
  | 'callbackPages'
  | 'connect'
  | 'adminDeveloper'
  | 'utilities'

export interface Domain {
  key: DomainKey
  /** i18n key under `components.domain.<key>.title` */
  i18nKey: string
}

/** Ordered list — matches the order rendered on the landing page + sidebar. */
export const DOMAINS: Domain[] = [
  { key: 'donations', i18nKey: 'donations' },
  { key: 'subscriptions', i18nKey: 'subscriptions' },
  { key: 'billingPricing', i18nKey: 'billingPricing' },
  { key: 'purchases', i18nKey: 'purchases' },
  { key: 'callbackPages', i18nKey: 'callbackPages' },
  { key: 'connect', i18nKey: 'connect' },
  { key: 'adminDeveloper', i18nKey: 'adminDeveloper' },
  { key: 'utilities', i18nKey: 'utilities' },
]

/**
 * Manual mapping `componentName → domain`. Drives BOTH the landing
 * sections and the sidebar tree. Components not listed here are dropped
 * from the showcase (acts as the "internal-only" filter).
 */
const COMPONENT_TO_DOMAIN: Record<string, DomainKey> = {
  // Donations
  DonateButton: 'donations',
  DonateModal: 'donations',
  DonationCard: 'donations',
  DonationWall: 'donations',

  // Subscriptions
  SubscribeButton: 'subscriptions',
  SubscriptionCard: 'subscriptions',
  SubscriptionPlanCard: 'subscriptions',
  ChangePlanButton: 'subscriptions',

  // Billing & Pricing
  PricingPage: 'billingPricing',
  BillingDashboard: 'billingPricing',
  InvoiceHistorySection: 'billingPricing',
  ManageSubscriptionButton: 'billingPricing',
  PastDueBanner: 'billingPricing',

  // Purchases & Marketplace
  PurchaseButton: 'purchases',
  PurchaseCard: 'purchases',
  ProductCard: 'purchases',
  ProductGrid: 'purchases',
  PaymentHistory: 'purchases',

  // Callback Pages (Stripe Checkout return)
  PaymentSuccessPage: 'callbackPages',
  DonateSuccessPage: 'callbackPages',
  DonateCancelPage: 'callbackPages',
  SubscribeSuccessPage: 'callbackPages',
  SubscribeCancelPage: 'callbackPages',
  PurchaseSuccessPage: 'callbackPages',
  PurchaseCancelPage: 'callbackPages',

  // Stripe Connect
  ConnectStatusCard: 'connect',
  ConnectOnboardForm: 'connect',
  ConnectFeeSummary: 'connect',
  DeveloperConnectDashboard: 'connect',

  // Admin & Developer
  PayAdminDashboard: 'adminDeveloper',
  PlansManager: 'adminDeveloper',
  PlanEditorDialog: 'adminDeveloper',
  PayDeveloperPortal: 'adminDeveloper',
  CreatePayKeyModal: 'adminDeveloper',
  UserPaymentDashboard: 'adminDeveloper',

  // Utilities & Gates
  FeatureGate: 'utilities',
  ConfirmActionDialog: 'utilities',
  PromoCodeInput: 'utilities',
  RefundButton: 'utilities',
  PayNotConfiguredCard: 'utilities',
}

/**
 * Components explicitly hidden from the showcase, regardless of the
 * "Show internal" admin toggle. Use sparingly — this is for components
 * that have no UI surface (utility wrappers, render-prop guards).
 */
const HIDDEN_COMPONENTS = new Set<string>([])

/**
 * Folder-bucket category names from the registry that should NEVER be
 * surfaced as standalone categories on the new docs landing — they're
 * faux-positives produced by the file-system-driven generator.
 */
export const FOLDER_BUCKET_CATEGORIES = new Set<string>([
  'Admin',
  'Banners',
  'Billing',
  'Callback Pages',
  'Common',
  'Connect',
  'Dashboards',
  'Developer Portal',
  'Donations',
  'Gates',
  'Generic',
  'Marketplace',
  'Misc',
  'Pricing',
  'Purchases',
  'Subscriptions',
])

/**
 * A "feature group" collapses sibling variants of the same primitive
 * into one showcase entry (e.g. `Donate` = `DonateButton` + `DonateModal`).
 * The detail page shows Tabs to switch between variants without polluting
 * the landing with 2-3× the entries.
 */
export interface FeatureGroup {
  /** Slug used in the URL (e.g. `'donate'`). */
  slug: string
  /** Display name (e.g. `'Donate'`). */
  name: string
  /** Variant entries — keys are the variant labels (`'Button'`, `'Modal'`, `'Card'`, ...). */
  variants: Array<{ label: string; entry: ComponentEntry }>
}

/**
 * Manual feature definitions. Each declares the variant order
 * (Button → Modal → Card → Wall) so the Tabs always render the lightest
 * primitive first.
 */
const FEATURE_DEFINITIONS: Array<{
  slug: string
  name: string
  variants: Array<{ label: string; component: string }>
}> = [
  {
    slug: 'donate',
    name: 'Donate',
    variants: [
      { label: 'Button', component: 'DonateButton' },
      { label: 'Modal', component: 'DonateModal' },
      { label: 'Card', component: 'DonationCard' },
      { label: 'Wall', component: 'DonationWall' },
    ],
  },
  {
    slug: 'subscribe',
    name: 'Subscribe',
    variants: [
      { label: 'Button', component: 'SubscribeButton' },
      { label: 'Card', component: 'SubscriptionCard' },
      { label: 'Plan', component: 'SubscriptionPlanCard' },
    ],
  },
  {
    slug: 'purchase',
    name: 'Purchase',
    variants: [
      { label: 'Button', component: 'PurchaseButton' },
      { label: 'Card', component: 'PurchaseCard' },
    ],
  },
  {
    slug: 'donate-callback',
    name: 'Donate Callback',
    variants: [
      { label: 'Success', component: 'DonateSuccessPage' },
      { label: 'Cancel', component: 'DonateCancelPage' },
    ],
  },
  {
    slug: 'subscribe-callback',
    name: 'Subscribe Callback',
    variants: [
      { label: 'Success', component: 'SubscribeSuccessPage' },
      { label: 'Cancel', component: 'SubscribeCancelPage' },
    ],
  },
  {
    slug: 'purchase-callback',
    name: 'Purchase Callback',
    variants: [
      { label: 'Success', component: 'PurchaseSuccessPage' },
      { label: 'Cancel', component: 'PurchaseCancelPage' },
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
 * 8 domains, and collapses variant pairs into feature groups.
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
    // Sort: features first (by name), then singles by component name.
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
 * the component declaration is preceded by an `@internal` TSDoc tag).
 * The text fallback is a defensive guard for older generated registries.
 */
function isInternalEntry(entry: ComponentEntry): boolean {
  if (entry.isInternal === true) return true
  const haystack = `${entry.summary} ${entry.description}`.toLowerCase()
  return haystack.includes('@internal')
}

/**
 * Slug helper for feature fallback. Singles use the
 * `/docs/components/<category-slug>/<component-slug>` route. Feature
 * group cards link to the first variant's existing route so all links
 * resolve to a real page.
 */
export function featureFallbackComponentName(group: FeatureGroup): string {
  return group.variants[0]?.entry.name ?? ''
}

/**
 * Reverse lookup: given a component name, return the feature group it
 * belongs to (if any). Used by the detail page to detect when a component
 * is part of a feature group so it can render variant tabs at the top.
 */
export function findFeatureGroupForComponent(
  componentName: string,
  registry: readonly ComponentEntry[]
): FeatureGroup | null {
  // Index registry once for variant lookup.
  const byName = new Map<string, ComponentEntry>()
  for (const entry of registry) byName.set(entry.name, entry)

  for (const def of FEATURE_DEFINITIONS) {
    const isMember = def.variants.some(v => v.component === componentName)
    if (!isMember) continue

    // Hydrate the full FeatureGroup with resolved entries (matches the
    // shape `buildShowcaseTree` produces).
    const variants: FeatureGroup['variants'] = []
    for (const v of def.variants) {
      const entry = byName.get(v.component)
      if (entry) variants.push({ label: v.label, entry })
    }
    if (variants.length === 0) return null
    return { slug: def.slug, name: def.name, variants }
  }
  return null
}

/**
 * Lowercase a variant label so it can be used as a URL param value.
 * `'Button'` → `'button'`, `'Modal'` → `'modal'`, etc. The reverse
 * lookup is case-insensitive on the variant tabs.
 */
export function variantLabelToSlug(label: string): string {
  return label.toLowerCase()
}
