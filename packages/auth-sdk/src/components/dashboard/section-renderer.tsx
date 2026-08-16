'use client'

import type { Application, AuditLogEntry } from '../../core/types.js'
import { AuditLogSection } from '../audit-log-section.js'
import { ProfileBlock } from './ProfileBlock.js'
import { SettingsBlock } from './SettingsBlock.js'
import { BillingSection, OverviewSection, PlaceholderSection, UsageSection } from './sections.js'
import {
  type EZAuthDashboardSection,
  type EZAuthDashboardSlots,
  type EZAuthDashboardTexts,
} from './types.js'

interface SectionRendererProps {
  section: EZAuthDashboardSection
  user: {
    email: string
    username: string
    firstName?: string
    lastName?: string
    avatar?: string
    apps?: string[]
    globalRoles?: string[]
    appRoles?: Record<string, string[]>
    createdAt: string
  }
  appName?: string
  locale: string
  texts: EZAuthDashboardTexts
  slots?: EZAuthDashboardSlots
  /** Admin / superadmin OR. Forwarded to the BillingSection hint. */
  isAdmin: boolean
  /** SSR pre-fetched audit entries — forwarded to default AuditLogSection. */
  initialAuditEntries?: AuditLogEntry[]
  /**
   * SSR pre-fetched applications — currently unused at the SectionRenderer
   * level (the ezauth dashboard wires Applications via `slots.applications`),
   * accepted for forward-compat when SDK consumers rely on the default slot.
   */
  initialApplications?: Application[]
}

/**
 * Renders the body of the active dashboard section. Extracted from the
 * EZAuthDashboard root so the file stays under the 400-line policy ceiling.
 *
 * @internal
 */
export function SectionRenderer({
  section,
  user,
  appName,
  locale,
  texts,
  slots,
  isAdmin,
  initialAuditEntries,
  // initialApplications is currently unused — see SectionRendererProps doc.
  initialApplications: _initialApplications,
}: SectionRendererProps) {
  switch (section) {
    case 'overview':
      return slots?.overview ?? <OverviewSection user={user} texts={texts} locale={locale} />

    case 'account':
      return slots?.account ?? <ProfileBlock appName={appName} texts={texts} locale={locale} />

    case 'applications':
      return (
        slots?.applications ?? (
          <PlaceholderSection
            icon="lucide:AppWindow"
            title={texts.navApplications}
            description="Configure this section by passing `slots.applications` from your app."
          />
        )
      )

    case 'billing':
      return slots?.billing ?? <BillingSection texts={texts} isAdmin={isAdmin} />

    case 'usage':
      return slots?.usage ?? <UsageSection texts={texts} />

    case 'activity':
      return (
        slots?.activity ?? (
          <AuditLogSection
            locale={locale}
            texts={texts.auditLog}
            initialEntries={initialAuditEntries}
          />
        )
      )

    case 'settings':
      return slots?.settings ?? <SettingsBlock appName={appName} texts={texts} />
  }
}
