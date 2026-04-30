'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  H2,
  Input,
  Label,
  P,
  Skeleton,
  Span,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useEffect, useState } from 'react'
import type { ApiKeyItem, Application } from '../../core/types.js'
import {
  useApplication,
  useRevokeApplication,
  useUpdateApplication,
} from '../../react/applications.js'
import { DeveloperPortal } from '../developer/DeveloperPortal.js'
import type { DeveloperPortalTexts } from '../developer/types.js'
import type { ApplicationDetailViewTexts } from './types.js'
import { defaultApplicationsFlowTexts } from './types.js'
import { ApplicationThemeEditor } from './ApplicationThemeEditor.js'
import { WebhookSecretSection } from './WebhookSecretSection.js'

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

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [requireEmailVerification, setRequireEmailVerification] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    if (application) {
      setName(application.name)
      setDescription(application.description ?? '')
      setRequireEmailVerification(application.requireEmailVerification ?? false)
    }
  }, [application])

  const updateMutation = useUpdateApplication({
    onSuccess: () => {
      toast.success(texts.settingsSaveSuccess)
    },
    onError: () => {
      toast.error(texts.settingsSaveFailed)
    },
  })

  const revokeMutation = useRevokeApplication({
    onSuccess: () => {
      toast.success(texts.archiveSuccess)
      setConfirmOpen(false)
      onArchived?.()
    },
    onError: () => {
      toast.error(texts.archiveFailed)
    },
  })

  const handleSave = () => {
    if (!application) return
    updateMutation.mutate({
      id: application.id,
      data: {
        name: name.trim(),
        description: description.trim() || undefined,
        requireEmailVerification,
      },
    })
  }

  const isArchived = application?.status === 'archived'
  const isDirty =
    application &&
    (name.trim() !== application.name ||
      (description.trim() || '') !== (application.description ?? '') ||
      requireEmailVerification !== (application.requireEmailVerification ?? false))

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </CardContent>
      </Card>
    )
  }

  if (isError || !application) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{texts.errorTitle}</CardTitle>
          <CardDescription>{texts.errorDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {texts.retry}
            </Button>
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                {texts.back}
              </Button>
            )}
          </Div>
        </CardContent>
      </Card>
    )
  }

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
          <Card>
            <CardHeader>
              <CardTitle>{texts.settingsTitle}</CardTitle>
              <CardDescription>{texts.settingsDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Div className="space-y-2">
                <Label htmlFor="detail-slug">{texts.settingsSlugLabel}</Label>
                <Div className="flex items-center">
                  <Input id="detail-slug" value={application.slug} disabled readOnly />
                </Div>
                <P className="text-xs text-muted-foreground">
                  <Span>{texts.settingsSlugHelp}</Span>
                </P>
              </Div>
              <Div className="space-y-2">
                <Label htmlFor="detail-name">{texts.settingsNameLabel}</Label>
                <Input
                  id="detail-name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={64}
                />
              </Div>
              <Div className="space-y-2">
                <Label htmlFor="detail-description">{texts.settingsDescriptionLabel}</Label>
                <Textarea
                  id="detail-description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </Div>
              <Div className="flex items-start justify-between gap-4 rounded-md border border-border bg-muted/30 p-3">
                <Div className="space-y-1">
                  <Label
                    htmlFor="detail-require-email-verification"
                    className="cursor-pointer text-sm font-medium"
                  >
                    {texts.settingsRequireEmailVerificationLabel}
                  </Label>
                  <P className="text-xs text-muted-foreground">
                    {texts.settingsRequireEmailVerificationHelp}
                  </P>
                </Div>
                <Switch
                  id="detail-require-email-verification"
                  checked={requireEmailVerification}
                  onCheckedChange={setRequireEmailVerification}
                />
              </Div>
              <Div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={!isDirty || updateMutation.isPending || !name.trim()}
                >
                  {updateMutation.isPending ? texts.settingsSaving : texts.settingsSave}
                </Button>
              </Div>
            </CardContent>
          </Card>

          {!isArchived && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">{texts.archiveSectionTitle}</CardTitle>
                <CardDescription>{texts.archiveSectionDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="destructive" onClick={() => setConfirmOpen(true)}>
                  {texts.archiveButton}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.archiveConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{texts.archiveConfirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              {texts.archiveCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeMutation.mutate({ id: application.id, cascade: true })}
              disabled={revokeMutation.isPending}
            >
              {texts.archiveSubmit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Div>
  )
}
