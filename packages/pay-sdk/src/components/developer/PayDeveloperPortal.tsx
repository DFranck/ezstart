'use client'

/**
 * Drop-in developer portal for managing EZPay API keys.
 *
 * Consumes {@link usePayKeys}, {@link useCreatePayKey}, {@link useRevokePayKey}
 * and {@link useRotatePayKey} from `@ezstart/pay-sdk/react`. Requires an
 * Application context (`applicationId`) — ezauth enforces ownership on the
 * server-side.
 *
 * The "key created" modal is shared with `@ezstart/auth-sdk` so the UX stays
 * identical across services.
 */

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
  Code,
  type ColumnDef,
  DataTable,
  Div,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { KeyCreatedModal } from '@ezstart/auth-sdk'
import { useMemo, useState } from 'react'
import type { PayApiKeyItem } from '../../core/types.js'
import { useCreatePayKey, usePayKeys, useRevokePayKey, useRotatePayKey } from '../../react/index.js'
import { usePayLocale } from '../../react/pay-provider.js'
import { CreatePayKeyModal } from './CreatePayKeyModal.js'
import type { PayDeveloperPortalTexts } from './types.js'
import { defaultPayDeveloperPortalTexts } from './types.js'

export interface PayDeveloperPortalProps {
  /** Application to scope the displayed keys to. */
  applicationId?: string
  /** Whether the user is authenticated and data should be fetched. */
  enabled?: boolean
  /**
   * Locale for date formatting. When omitted, inherits from
   * `<PayProvider locale={…}>` context (default `'en'`).
   */
  locale?: string
  /** All user-facing strings. Falls back to English defaults. */
  texts?: Partial<PayDeveloperPortalTexts>
  /** Extra header content (e.g. breadcrumb, back button). */
  headerActions?: React.ReactNode
  /** Additional className on root Card. */
  className?: string
  /** Show admin scope option in create modal (for superadmins). */
  showSuperadminScope?: boolean
}

/** Deep-merge the user-provided texts over the English defaults. */
function mergeTexts(partial?: Partial<PayDeveloperPortalTexts>): PayDeveloperPortalTexts {
  if (!partial) return defaultPayDeveloperPortalTexts
  return {
    ...defaultPayDeveloperPortalTexts,
    ...partial,
    table: { ...defaultPayDeveloperPortalTexts.table, ...partial.table },
    create: { ...defaultPayDeveloperPortalTexts.create, ...partial.create },
    created: { ...defaultPayDeveloperPortalTexts.created, ...partial.created },
  }
}

export function PayDeveloperPortal({
  applicationId,
  enabled = true,
  locale,
  texts: partialTexts,
  headerActions,
  className,
  showSuperadminScope = false,
}: PayDeveloperPortalProps) {
  const texts = mergeTexts(partialTexts)
  const contextLocale = usePayLocale()
  const resolvedLocale = locale ?? contextLocale

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [revokeTargetId, setRevokeTargetId] = useState<string | null>(null)

  const {
    data: apiKeys = [] as PayApiKeyItem[],
    isLoading,
    isError,
    refetch,
  } = usePayKeys({ applicationId, enabled: enabled && !!applicationId })

  const createMutation = useCreatePayKey({
    onSuccess: data => {
      setShowCreateModal(false)
      setCreatedKey(data.key)
    },
    onError: () => {
      toast.error(texts.createFailed)
    },
  })

  const revokeMutation = useRevokePayKey({
    onSuccess: () => {
      toast.success(texts.revokeSuccess)
      setRevokeTargetId(null)
    },
    onError: () => {
      toast.error(texts.revokeFailed)
    },
  })

  const rotateMutation = useRotatePayKey({
    onSuccess: data => {
      toast.success(texts.rotateSuccess)
      setCreatedKey(data.key)
    },
    onError: () => {
      toast.error(texts.rotateFailed)
    },
  })

  const formatDate = (iso: string | null): string => {
    if (!iso) return texts.table.never
    return new Date(iso).toLocaleDateString(resolvedLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const columns = useMemo<ColumnDef<PayApiKeyItem>[]>(
    () => [
      {
        accessorKey: 'name',
        header: texts.table.name,
        cell: ({ row }) => <Span className="font-medium text-foreground">{row.original.name}</Span>,
      },
      {
        accessorKey: 'keyPrefix',
        header: texts.table.keyPrefix,
        cell: ({ row }) => (
          <Code className="text-sm text-muted-foreground">{row.original.keyPrefix}...</Code>
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'status',
        header: texts.table.status,
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge variant={status === 'active' ? 'success' : 'destructive'}>
              {status === 'active' ? texts.table.statusActive : texts.table.statusRevoked}
            </Badge>
          )
        },
      },
      {
        accessorKey: 'createdAt',
        header: texts.table.created,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        accessorKey: 'lastUsedAt',
        header: texts.table.lastUsed,
        cell: ({ row }) => formatDate(row.original.lastUsedAt),
      },
      {
        id: 'actions',
        header: texts.table.actions,
        cell: ({ row }) => {
          if (row.original.status === 'revoked') return null
          return (
            <Div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => rotateMutation.mutate(row.original.id)}
                disabled={rotateMutation.isPending}
              >
                {texts.table.rotate}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRevokeTargetId(row.original.id)}
                disabled={revokeMutation.isPending}
              >
                {texts.table.revoke}
              </Button>
            </Div>
          )
        },
        enableSorting: false,
      },
    ],
    [texts.table, resolvedLocale, rotateMutation, revokeMutation]
  )

  return (
    <Card className={className}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-xl md:text-2xl font-bold">{texts.title}</CardTitle>
        <CardDescription>{texts.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Div className="flex justify-between items-center">
          {headerActions ?? <Div />}
          <Button onClick={() => setShowCreateModal(true)} disabled={!applicationId}>
            {texts.createKey}
          </Button>
        </Div>

        {!applicationId && (
          <P className="text-muted-foreground text-center py-8">{texts.selectApplicationNotice}</P>
        )}

        {applicationId && isLoading && (
          <Div className="flex items-center justify-center min-h-[40vh]">
            <Spinner variant="primary" size="md" />
          </Div>
        )}

        {applicationId && isError && (
          <Div className="text-center space-y-3">
            <P className="text-destructive">{texts.fetchFailed}</P>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              {texts.retry}
            </Button>
          </Div>
        )}

        {applicationId && !isLoading && !isError && apiKeys.length === 0 && (
          <P className="text-muted-foreground text-center py-8">{texts.noKeys}</P>
        )}

        {applicationId && !isLoading && !isError && apiKeys.length > 0 && (
          <DataTable columns={columns} data={apiKeys} pageSize={10} density="compact" />
        )}
      </CardContent>

      {applicationId && (
        <CreatePayKeyModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={data => createMutation.mutate(data)}
          isSubmitting={createMutation.isPending}
          texts={texts.create}
          applicationId={applicationId}
          showAdminScope={showSuperadminScope}
        />
      )}

      <KeyCreatedModal
        isOpen={!!createdKey}
        onClose={() => setCreatedKey(null)}
        rawKey={createdKey}
        texts={texts.created}
      />

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
