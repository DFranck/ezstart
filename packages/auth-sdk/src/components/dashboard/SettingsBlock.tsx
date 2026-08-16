'use client'

import { Card, CardContent, CardHeader, Div, H3 } from '@ezstart/ui/components'
import { OAuthProvidersSection } from '../oauth-providers-section.js'
import { SessionsManager } from '../SessionsManager.js'
import { TwoFactorSettings } from '../TwoFactorSettings.js'
import { UserSettings } from '../UserSettings.js'
import type { EZAuthDashboardTexts } from './types.js'

interface SettingsBlockProps {
  appName?: string
  texts: EZAuthDashboardTexts
}

/**
 * Stack of UserSettings + TwoFactor + Sessions + OAuthProviders cards. Used
 * for `?section=settings` (security + preferences). Email verification was
 * moved to {@link ProfileBlock} (Account section) in 2026-05-01 so the two
 * sections have distinct purposes.
 *
 * @internal
 */
export function SettingsBlock({ appName, texts }: SettingsBlockProps) {
  return (
    <Div className="space-y-6 w-full max-w-lg mx-auto">
      {/*
        showConnectedAccounts={false} — `<OAuthProvidersSection>` below is the
        canonical multi-provider connected accounts UI (Google, GitHub coming
        soon, Discord coming soon, ...). UserSettings used to render its own
        Google-only "Connected Accounts" card which duplicated the section
        right above the OAuth one (cf. FIX-E2E-BATCH-001 BUG 6).
      */}
      <UserSettings appName={appName} texts={texts.settings} showConnectedAccounts={false} />

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

      <OAuthProvidersSection appName={appName} texts={texts.oauthProviders} />
    </Div>
  )
}
