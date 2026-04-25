'use client'

import { Card, CardContent, CardHeader, Div, H3 } from '@ezstart/ui/components'
import { AuthAdminDashboard } from '../AuthAdminDashboard.js'
import { DeveloperPortal } from '../developer/index.js'
import { EmailVerificationStatus } from '../EmailVerificationStatus.js'
import { SessionsManager } from '../SessionsManager.js'
import { TwoFactorSettings } from '../TwoFactorSettings.js'
import { UserSettings } from '../UserSettings.js'
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
  apiKeysEnabled: boolean
  locale: string
  texts: EZAuthDashboardTexts
  slots?: EZAuthDashboardSlots
  isAdmin: boolean
  isSuper: boolean
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
  apiKeysEnabled,
  locale,
  texts,
  slots,
  isAdmin,
  isSuper,
}: SectionRendererProps) {
  switch (section) {
    case 'overview':
      return slots?.overview ?? <OverviewSection user={user} texts={texts} />

    case 'account':
      return slots?.account ?? <SettingsBlock appName={appName} texts={texts} />

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

    case 'api-keys':
      return (
        slots?.apiKeys ?? (
          <DeveloperPortal
            enabled={apiKeysEnabled}
            locale={locale}
            texts={texts.developerPortal}
            showAdminScope={isSuper}
            appOptions={user.apps ?? []}
          />
        )
      )

    case 'billing':
      return slots?.billing ?? <BillingSection texts={texts} isAdmin={isAdmin} />

    case 'usage':
      return slots?.usage ?? <UsageSection texts={texts} />

    case 'settings':
      return slots?.settings ?? <SettingsBlock appName={appName} texts={texts} />

    case 'users':
      return (
        slots?.users ?? (
          <AuthAdminDashboard scope={isSuper ? 'all' : 'myApps'} appName="*" texts={texts.admin} />
        )
      )

    case 'platform':
      return slots?.platform ?? <AuthAdminDashboard scope="all" appName="*" texts={texts.admin} />
  }
}

/**
 * Stack of UserSettings + EmailVerification + TwoFactor + Sessions cards.
 *
 * @internal
 */
function SettingsBlock({ appName, texts }: { appName?: string; texts: EZAuthDashboardTexts }) {
  return (
    <Div className="space-y-6 w-full max-w-lg mx-auto">
      <UserSettings appName={appName} texts={texts.settings} />

      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.settingsEmailVerification}</H3>
        </CardHeader>
        <CardContent>
          <EmailVerificationStatus texts={texts.emailVerification} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.settingsTwoFactor}</H3>
        </CardHeader>
        <CardContent>
          <TwoFactorSettings texts={texts.twoFactor} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <H3 className="text-sm font-medium text-foreground">{texts.settingsSessions}</H3>
        </CardHeader>
        <CardContent>
          <SessionsManager texts={texts.sessions} />
        </CardContent>
      </Card>
    </Div>
  )
}
