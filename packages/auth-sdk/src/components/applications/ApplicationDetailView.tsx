'use client'

import {
  Badge,
  Button,
  Div,
  H2,
  P,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ezstart/ui/components'
import type { ApiKeyItem, Application } from '../../core/types.js'
import { useApplication } from '../../react/applications.js'
import { DeveloperPortal } from '../developer/DeveloperPortal.js'
import type { DeveloperPortalTexts } from '../developer/types.js'
import type { ApplicationDetailViewTexts } from './types.js'
import { defaultApplicationsFlowTexts } from './types.js'
import { ApplicationThemeEditor } from './ApplicationThemeEditor.js'
import { WebhookSecretSection } from './WebhookSecretSection.js'
import { ApplicationDetailError, ApplicationDetailLoading } from './application-detail/states.js'
import { SettingsTab } from './application-detail/SettingsTab.js'

export interface ApplicationDetailViewProps {
  applicationId: string
  /** Locale for date formatting (default `'en'`). */
  locale?: string
  /** Partial texts override — falls back to English defaults. */
  texts?: Partial<ApplicationDetailViewTexts>
  /** Optional texts for the embedded DeveloperPortal (API keys tab). */
  developerPortalTexts?: Partial<DeveloperPortalTexts>
  /** Invoked when the user clicks "Back to applications". */
  onBack?: () => void
  /** Invoked after a successful archive. Consumer typically routes away. */
  onArchived?: () => void
  /** Show admin scope option in the Create Key modal (for superadmins). */
  showAdminScope?: boolean
  /**
   * Enable the `themeEnabled` toggle in the Theme tab. Pass `false` when the
   * owner does not have the EZAuth Pro feature — the tokens remain editable
   * (so users can preview) but cannot be activated on the auth pages.
   * Default: `true` (the feature is always editable in the current plan
   * matrix).
   */
  canEnableTheme?: boolean
  /**
   * Server-side pre-fetched application (via `getServerApplication()` from
   * `@ezstart/auth-sdk/server`). When provided, React Query is seeded with
   * this value so the detail tabs render on the very first paint — no
   * `<Skeleton>` flash on direct loads of `/developer/[id]`.
   */
  initialApplication?: Application
  /**
   * Server-side pre-fetched API keys (via `getServerApiKeys()`). Forwarded
   * to the embedded `<DeveloperPortal>` so the keys table is also
   * SSR-bootstrapped on the API Keys tab.
   */
  initialKeys?: ApiKeyItem[]
}

function mergeTexts(partial?: Partial<ApplicationDetailViewTexts>): ApplicationDetailViewTexts {
  if (!partial) return defaultApplicationsFlowTexts.detail
  return { ...defaultApplicationsFlowTexts.detail, ...partial }
}

/**
 * Tabbed Application detail view: Keys, Settings, Theme, Webhooks. Owns
 * the full lifecycle of one Application from a single page.
 *
 * @example
 * ```tsx
 * <ApplicationDetailView applicationId={params.id} onBack={() => router.back()} />
 * ```
 */
export function ApplicationDetailView({
  applicationId,
  locale = 'en',
  texts: partialTexts,
  developerPortalTexts,
  onBack,
  onArchived,
  showAdminScope = false,
  canEnableTheme = true,
  initialApplication,
  initialKeys,
}: ApplicationDetailViewProps) {
  const texts = mergeTexts(partialTexts)

  const {
    data: application,
    isLoading,
    isError,
    refetch,
  } = useApplication(
    applicationId,
    true,
    initialApplication ? { initialData: initialApplication } : undefined
  )

  if (isLoading) {
    return <ApplicationDetailLoading />
  }

  if (isError || !application) {
    return <ApplicationDetailError texts={texts} onRetry={() => refetch()} onBack={onBack} />
  }

  const isArchived = application.status === 'archived'

  return (
    <Div className="space-y-4" data-locale={locale}>
      <Div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <Div className="space-y-1">
          <Div className="flex items-center gap-2">
            <H2 size="h3">{application.name}</H2>
            <Badge variant={isArchived ? 'secondary' : 'outline'} size="sm">
              {application.slug}
            </Badge>
          </Div>
          {application.description && (
            <P className="text-sm text-muted-foreground">{application.description}</P>
          )}
        </Div>
        {onBack && (
          <Button variant="outline" size="sm" onClick={onBack}>
            {texts.back}
          </Button>
        )}
      </Div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys">{texts.tabKeys}</TabsTrigger>
          <TabsTrigger value="settings">{texts.tabSettings}</TabsTrigger>
          <TabsTrigger value="theme">{texts.tabTheme}</TabsTrigger>
          <TabsTrigger value="webhooks">{texts.tabWebhooks}</TabsTrigger>
        </TabsList>

        <TabsContent value="keys">
          <DeveloperPortal
            applicationId={application.id}
            locale={locale}
            showAdminScope={showAdminScope}
            texts={developerPortalTexts}
            initialKeys={initialKeys}
          />
        </TabsContent>

        <TabsContent value="theme">
          <ApplicationThemeEditor
            application={application}
            canEnableTheme={canEnableTheme}
            texts={texts}
          />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhookSecretSection application={application} texts={texts} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <SettingsTab
            application={application}
            texts={texts}
            {...(onArchived ? { onArchived } : {})}
          />
        </TabsContent>
      </Tabs>
    </Div>
  )
}
