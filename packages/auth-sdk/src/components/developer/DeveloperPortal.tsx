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
} from '@ezstart/ui/components'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  P,
  Spinner,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useState } from 'react'
import type { ApiKeyItem } from '../../core/types.js'
import {
  useApiKeys,
  useCreateApiKey,
  useRevokeApiKey,
  useRotateApiKey,
} from '../../react/api-keys.js'
import type { DeveloperPortalTexts } from './types.js'
import { defaultDeveloperPortalTexts } from './types.js'
import { ApiKeysTable } from './ApiKeysTable.js'
import { CreateKeyModal } from './CreateKeyModal.js'
import { KeyCreatedModal } from './KeyCreatedModal.js'
import { UsageDetailsModal } from './UsageDetailsModal.js'
import { logger } from '../internal-logger.js'

export interface DeveloperPortalProps {
  /** Whether the user is authenticated and data should be fetched. */
  enabled?: boolean
  /** Locale for date formatting. Defaults to `'en'`. */
  locale?: string
  /** All user-facing strings. Falls back to English defaults. */
  texts?: Partial<DeveloperPortalTexts>
  /** Extra header content (e.g. billing link, back button). */
  headerActions?: React.ReactNode
  /** Additional className on root Card. */
  className?: string
  /** Show admin scope option in create modal (for superadmins). */
  showAdminScope?: boolean
  /**
   * Application context (P6+). When provided, the portal only shows keys for
   * that application and the create-key modal pre-fills the app scope.
   * When omitted, the portal falls back to legacy "all user keys" behaviour
   * and shows a notice inviting the user to pick an application.
   */
  applicationId?: string
  /**
   * Legacy: apps the user has access to — rendered as options in the App Scope
   * dropdown. Ignored when `applicationId` is provided.
   * @deprecated Pass `applicationId` instead.
   */
  appOptions?: string[]
  /**
   * Server-side pre-fetched API keys (via `getServerApiKeys()` from
   * `@ezstart/auth-sdk/server`). When provided, the React Query cache is
   * seeded with this value so the very first paint already shows the keys
   * table — no client `<Spinner>` flash. React Query still revalidates in
   * the background to keep the data fresh.
   */
  initialKeys?: ApiKeyItem[]
}

function mergeTexts(partial?: Partial<DeveloperPortalTexts>): DeveloperPortalTexts {
  if (!partial) return defaultDeveloperPortalTexts
  return {
    ...defaultDeveloperPortalTexts,
    ...partial,
    table: { ...defaultDeveloperPortalTexts.table, ...partial.table },
    create: { ...defaultDeveloperPortalTexts.create, ...partial.create },
    created: { ...defaultDeveloperPortalTexts.created, ...partial.created },
    usage: { ...defaultDeveloperPortalTexts.usage, ...partial.usage },
  }
}

/**
 * Developer portal aggregating the API keys table, create-key modal,
 * created-key modal, and usage-details modal for the authenticated user
 * or scoped Application.
 *
 * @example
 * ```tsx
 * <DeveloperPortal />
 * ```
 */
export function DeveloperPortal({
  enabled = true,
  locale = 'en',
  texts: partialTexts,
  headerActions,
  className,
  showAdminScope = false,
  applicationId,
  appOptions = [],
  initialKeys,
}: DeveloperPortalProps) {
  const texts = mergeTexts(partialTexts)

  // Surface deprecation warning when consumer passes the legacy `appOptions` prop
  // without an explicit `applicationId`.
  if (!applicationId && appOptions.length > 0 && typeof window !== 'undefined') {
    logger.warn(
      '[auth-sdk] DeveloperPortal: `appOptions` is deprecated. Pass `applicationId` instead.'
    )
  }

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)
  const [usageKeyId, setUsageKeyId] = useState<string | null>(null)

  const {
    data: allApiKeys = [] as ApiKeyItem[],
    isLoading,
    isError,
    refetch,
  } = useApiKeys(enabled, initialKeys ? { initialData: initialKeys } : undefined)

  // When an Application is selected, scope the displayed keys to it. Pre-P6
  // keys without `applicationId` are excluded from that view.
  const apiKeys = applicationId
    ? allApiKeys.filter((k: ApiKeyItem) => k.applicationId === applicationId)
    : allApiKeys

  const createMutation = useCreateApiKey({
    onSuccess: data => {
      setShowCreateModal(false)
      setCreatedKey(data.key)
    },
    onError: () => {
      toast.error(texts.createFailed)
    },
  })

  const revokeMutation = useRevokeApiKey({
    onSuccess: () => {
      toast.success(texts.revokeSuccess)
      setRevokeTargetId(null)
    },
    onError: () => {
      toast.error(texts.revokeFailed)
    },
  })

  const rotateMutation = useRotateApiKey({
    onSuccess: data => {
      toast.success(texts.rotateSuccess)
      setCreatedKey(data.key)
    },
    onError: () => {
      toast.error(texts.rotateFailed)
    },
  })

  const usageKeyName = apiKeys.find((k: ApiKeyItem) => k.id === usageKeyId)?.name ?? ''

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{texts.title}</CardTitle>
        <CardDescription>{texts.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Div className="flex justify-between items-center">
          {headerActions ?? <Div />}
          <Button onClick={() => setShowCreateModal(true)}>{texts.createKey}</Button>
        </Div>

        {isLoading && (
          <Div className="flex items-center justify-center min-h-[50vh]">
            <Spinner variant="primary" size="md" />
          </Div>
        )}

        {isError && (
          <Div className="text-center space-y-3">
            <P className="text-destructive">{texts.fetchFailed}</P>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {texts.retry}
            </Button>
          </Div>
        )}

        {!isLoading && !isError && apiKeys.length === 0 && (
          <P className="text-muted-foreground text-center py-8">{texts.noKeys}</P>
        )}

        {!isLoading && !isError && apiKeys.length > 0 && (
          <ApiKeysTable
            keys={apiKeys}
            onRevoke={setRevokeTargetId}
            onRotate={id => rotateMutation.mutate(id)}
            onViewUsage={setUsageKeyId}
            isRevoking={revokeMutation.isPending}
            isRotating={rotateMutation.isPending}
            texts={texts.table}
            locale={locale}
          />
        )}
      </CardContent>

      {/* Create Key Modal */}
      <CreateKeyModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={data => createMutation.mutate(data)}
        isSubmitting={createMutation.isPending}
        texts={texts.create}
        showAdminScope={showAdminScope}
        applicationId={applicationId}
        appOptions={applicationId ? undefined : appOptions}
      />

      {/* Key Created Modal */}
      <KeyCreatedModal
        isOpen={!!createdKey}
        onClose={() => setCreatedKey(null)}
        rawKey={createdKey}
        texts={texts.created}
      />

      {/* Usage Details Modal */}
      <UsageDetailsModal
        isOpen={!!usageKeyId}
        onClose={() => setUsageKeyId(null)}
        keyId={usageKeyId}
        keyName={usageKeyName}
        texts={texts.usage}
      />

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeTargetId} onOpenChange={open => !open && setRevokeTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{texts.revokeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{texts.revokeConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{texts.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeTargetId && revokeMutation.mutate(revokeTargetId)}
            >
              {texts.revokeSubmit}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
