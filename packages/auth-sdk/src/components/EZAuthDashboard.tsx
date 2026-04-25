'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  DashboardContent,
  DashboardHeader,
  DashboardLayout,
  DashboardMain,
  DashboardSidebar,
  H2,
  Icon,
  SidebarFooter,
  SidebarHeader,
  SidebarLink,
  SidebarNav,
  SidebarToggle,
  Span,
} from '@ezstart/ui/components'
import { useAuth } from '../react/hooks.js'
import { UserMenu } from './UserMenu.js'
import { DashboardSkeleton } from './dashboard/sections.js'
import { SectionRenderer } from './dashboard/section-renderer.js'
import {
  DEFAULT_DASHBOARD_TEXTS,
  DEFAULT_SECTION_ORDER,
  type EZAuthDashboardExtraSection,
  type EZAuthDashboardSection,
  type EZAuthDashboardSlots,
  type EZAuthDashboardTexts,
  isAdminOrSuperadmin,
  isSuperadmin,
  navLabelFor,
  SECTION_ICONS,
  SECTION_VISIBILITY,
  type SectionVisibility,
} from './dashboard/types.js'

// Re-export the public types so the import path stays the same for consumers.
export type {
  EZAuthDashboardExtraSection,
  EZAuthDashboardSection,
  EZAuthDashboardSlots,
  EZAuthDashboardTexts,
} from './dashboard/types.js'

// ─── Component props ─────────────────────────────────────────────────────────

export interface EZAuthDashboardProps {
  /** Default active section when no `?section=` is present. Defaults to `'overview'`. */
  defaultSection?: EZAuthDashboardSection
  /** App name for role display and API key scoping. */
  appName?: string
  /** Whether DeveloperPortal should fetch data (when using the default slot). */
  apiKeysEnabled?: boolean
  /** Whether the current user owns at least one Application (gates sections). */
  hasOwnedApps?: boolean
  /** Locale for date formatting. */
  locale?: string
  /** All user-facing strings. Falls back to English defaults. */
  texts?: Partial<EZAuthDashboardTexts>
  /** Slot overrides for app-specific content. */
  slots?: EZAuthDashboardSlots
  /** Additional className on root wrapper. */
  className?: string
  /** Explicit list of sections to render. When omitted, all sections visible
   * under the RBAC rules are shown. Use this to hide/reorder tabs. */
  sections?: EZAuthDashboardSection[]
  /** Extra app-specific sections added after the canonical ones but before
   * the admin (`users`/`platform`) sections. */
  extraSections?: EZAuthDashboardExtraSection[]
  /**
   * Href for the sidebar brand link (top-left logo).
   * Defaults to `'/'`. Consumers should pass a locale-prefixed path
   * (e.g. `` `/${locale}` ``) to avoid hitting the non-localized root 404.
   */
  homeHref?: string
  /**
   * Optional click handler for the sidebar brand. When provided, the brand
   * becomes a `<button>` that invokes this callback instead of navigating to
   * `homeHref` (useful for SPA navigation or custom behavior).
   */
  onHomeClick?: () => void
}

/**
 * Federated dashboard shell that aggregates the user account, applications,
 * API keys, billing, usage, settings, and admin sections behind a single
 * Stripe/Clerk-style sidebar with progressive RBAC disclosure.
 *
 * Section bodies live in `./dashboard/section-renderer.tsx` and the
 * placeholder cards in `./dashboard/sections.tsx` to keep this file under
 * the 400-line policy ceiling.
 *
 * @example
 * ```tsx
 * <EZAuthDashboard
 *   appName="myapp"
 *   slots={{ applications: <MyAppsList /> }}
 *   homeHref="/en"
 * />
 * ```
 */
export function EZAuthDashboard({
  defaultSection = 'overview',
  appName,
  apiKeysEnabled = true,
  hasOwnedApps = false,
  locale = 'en',
  texts: textOverrides,
  slots,
  className,
  sections: sectionsProp,
  extraSections,
  homeHref = '/',
  onHomeClick,
}: EZAuthDashboardProps) {
  const { user, isAuthenticated } = useAuth()
  const texts: EZAuthDashboardTexts = { ...DEFAULT_DASHBOARD_TEXTS, ...textOverrides }
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const extras = extraSections ?? []
  const extraIds = extras.map(e => e.id)
  const allKnownIds: string[] = [...DEFAULT_SECTION_ORDER, ...extraIds]

  // Compute the initial section from `?section=...` query (deeplink) when
  // available, otherwise fall back to `defaultSection`.
  const querySection = searchParams?.get('section') ?? null
  const initialSection: string = useMemo(() => {
    if (querySection && allKnownIds.includes(querySection)) {
      return querySection
    }
    return defaultSection
  }, [querySection, defaultSection, allKnownIds.join(',')])

  const [activeSection, setActiveSection] = useState<string>(initialSection)

  // When the query-string changes (e.g. router.replace from a nav link),
  // follow it.
  useEffect(() => {
    if (querySection && allKnownIds.includes(querySection)) {
      setActiveSection(querySection)
    }
    // Intentionally not re-running on allKnownIds change (we hash via join).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySection])

  if (!mounted) {
    return <DashboardSkeleton />
  }

  if (!isAuthenticated || !user) {
    return null
  }

  const isAdmin = isAdminOrSuperadmin(user)
  const isSuper = isSuperadmin(user)

  const shouldShow = (vis: SectionVisibility): boolean => {
    switch (vis) {
      case 'always':
        return true
      case 'ownsApps':
        return hasOwnedApps
      case 'admin':
        return isAdmin
      case 'superadmin':
        return isSuper
    }
  }

  // Visibility filter — drops canonical sections the current user can't see.
  const canonicalSections = (sectionsProp ?? DEFAULT_SECTION_ORDER).filter(section =>
    shouldShow(SECTION_VISIBILITY[section])
  )

  // Filter extra sections by their visibility.
  const visibleExtras = extras.filter(e => shouldShow(e.visibility ?? 'always'))

  // Build nav items. Canonical non-admin sections first, then extras, then
  // admin sections (`users`/`platform`).
  const canonicalNonAdmin = canonicalSections.filter(s => s !== 'users' && s !== 'platform')
  const canonicalAdmin = canonicalSections.filter(s => s === 'users' || s === 'platform')

  const navItems: { id: string; label: string; icon: string }[] = [
    ...canonicalNonAdmin.map(section => ({
      id: section,
      label: navLabelFor(section, texts),
      icon: SECTION_ICONS[section],
    })),
    ...visibleExtras.map(e => ({ id: e.id, label: e.label, icon: e.icon })),
    ...canonicalAdmin.map(section => ({
      id: section,
      label: navLabelFor(section, texts),
      icon: SECTION_ICONS[section],
    })),
  ]

  // If the currently-active section is no longer visible (RBAC flip or custom
  // `sections` list), fall back to the first visible section.
  const visibleIds = navItems.map(n => n.id)
  const effectiveSection: string = visibleIds.includes(activeSection)
    ? activeSection
    : (visibleIds[0] ?? 'overview')

  const activeExtra = visibleExtras.find(e => e.id === effectiveSection)
  const isCanonical = DEFAULT_SECTION_ORDER.includes(effectiveSection as EZAuthDashboardSection)

  return (
    <DashboardLayout className={className}>
      <DashboardSidebar>
        <SidebarHeader>
          {onHomeClick ? (
            <button
              type="button"
              onClick={onHomeClick}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors bg-transparent border-0 p-0 cursor-pointer"
            >
              <Icon name="lucide:Code" className="h-5 w-5 text-primary shrink-0" />
              <Span className="font-semibold">{texts.brand}</Span>
            </button>
          ) : (
            <a
              href={homeHref}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <Icon name="lucide:Code" className="h-5 w-5 text-primary shrink-0" />
              <Span className="font-semibold">{texts.brand}</Span>
            </a>
          )}
        </SidebarHeader>

        <SidebarNav>
          {navItems.map(item => (
            <SidebarLink
              key={item.id}
              href="#"
              active={effectiveSection === item.id}
              icon={<Icon name={item.icon as 'lucide:Key'} className="h-4 w-4" />}
              onClick={e => {
                e.preventDefault()
                setActiveSection(item.id)
              }}
            >
              {item.label}
            </SidebarLink>
          ))}
        </SidebarNav>

        <SidebarFooter>
          <UserMenu variant="extended" side="top" avatarSize="sm" />
        </SidebarFooter>
      </DashboardSidebar>

      <DashboardMain>
        <DashboardHeader>
          <SidebarToggle mode="mobile" />
          <H2 className="text-lg font-semibold text-foreground">
            {navItems.find(n => n.id === effectiveSection)?.label}
          </H2>
        </DashboardHeader>

        <DashboardContent>
          {activeExtra ? (
            activeExtra.content
          ) : isCanonical ? (
            <SectionRenderer
              section={effectiveSection as EZAuthDashboardSection}
              user={user}
              appName={appName}
              apiKeysEnabled={apiKeysEnabled}
              locale={locale}
              texts={texts}
              slots={slots}
              isAdmin={isAdmin}
              isSuper={isSuper}
            />
          ) : null}
        </DashboardContent>
      </DashboardMain>
    </DashboardLayout>
  )
}
