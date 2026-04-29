'use client'

/**
 * Internal settings section embedded in `<AuthAdminDashboard>`.
 *
 * Stacks:
 * - Feature flags (toggle table)
 * - Maintenance mode (singleton editor)
 *
 * Both sub-sections auto-scoped server-side via JWT.
 *
 * @internal
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  type ColumnDef,
  DataTable,
  DataTableColumnHeader,
  Div,
  Input,
  Label,
  P,
  Skeleton,
  Span,
  Spinner,
  Switch,
  Textarea,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useFeatureFlags, useUpdateFeatureFlag } from '../../../react/feature-flags.js'
import { useMaintenanceMode, useUpdateMaintenanceMode } from '../../../react/maintenance-mode.js'
import type { FeatureFlag } from '../../../core/types.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AuthSettingsSectionFeatureFlagsTexts {
  title: string
  description: string
  enabled: string
  disabled: string
  columnKey: string
  columnDescription: string
  columnScope: string
  columnStatus: string
  columnUpdatedAt: string
  columnActions: string
  scopeGlobal: string
  scopeApp: string
  empty: string
  loading: string
  toggleSuccess: string
  toggleError: string
  refresh: string
}

export interface AuthSettingsSectionMaintenanceTexts {
  title: string
  description: string
  enable: string
  disable: string
  enabledBadge: string
  disabledBadge: string
  message: string
  messagePlaceholder: string
  scheduledEnd: string
  scheduledEndHelp: string
  startedAt: string
  saveButton: string
  enableButton: string
  disableButton: string
  saving: string
  saveSuccess: string
  saveError: string
  loading: string
  notSet: string
}

export interface AuthSettingsSectionTexts {
  featureFlags?: Partial<AuthSettingsSectionFeatureFlagsTexts>
  maintenance?: Partial<AuthSettingsSectionMaintenanceTexts>
}

export interface AuthSettingsSectionProps {
  /** Override default English labels. */
  texts?: AuthSettingsSectionTexts
  className?: string
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_FEATURE_FLAGS_TEXTS: AuthSettingsSectionFeatureFlagsTexts = {
  title: 'Feature flags',
  description: 'Toggle platform features at runtime without redeploying.',
  enabled: 'Enabled',
  disabled: 'Disabled',
  columnKey: 'Key',
  columnDescription: 'Description',
  columnScope: 'Scope',
  columnStatus: 'Status',
  columnUpdatedAt: 'Updated',
  columnActions: 'Actions',
  scopeGlobal: 'Global',
  scopeApp: 'App',
  empty: 'No feature flags configured yet.',
  loading: 'Loading feature flags...',
  toggleSuccess: 'Feature flag updated.',
  toggleError: 'Failed to update feature flag.',
  refresh: 'Refresh',
}

export const DEFAULT_MAINTENANCE_TEXTS: AuthSettingsSectionMaintenanceTexts = {
  title: 'Maintenance mode',
  description: 'Display a platform-wide banner warning users of degraded service.',
  enable: 'Enable maintenance mode',
  disable: 'Disable maintenance mode',
  enabledBadge: 'Active',
  disabledBadge: 'Inactive',
  message: 'Banner message',
  messagePlaceholder: 'We are currently performing maintenance...',
  scheduledEnd: 'Scheduled end (optional)',
  scheduledEndHelp: 'When users can expect service to resume.',
  startedAt: 'Started at',
  saveButton: 'Save changes',
  enableButton: 'Enable maintenance',
  disableButton: 'Disable maintenance',
  saving: 'Saving...',
  saveSuccess: 'Maintenance mode updated.',
  saveError: 'Failed to update maintenance mode.',
  loading: 'Loading maintenance status...',
  notSet: 'Not set',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert an ISO datetime to the value format expected by
 * `<input type="datetime-local">`: `YYYY-MM-DDTHH:MM`.
 */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convert a `datetime-local` input value to an ISO string (or null). */
function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Combined settings panel: feature flags + maintenance mode.
 *
 * @internal
 */
export function AuthSettingsSection({ texts, className }: AuthSettingsSectionProps) {
  return (
    <Div className={className}>
      <Div className="space-y-6">
        <MaintenanceCard texts={texts?.maintenance} />
        <FeatureFlagsCard texts={texts?.featureFlags} />
      </Div>
    </Div>
  )
}

// ---------------------------------------------------------------------------
// Feature flags sub-card
// ---------------------------------------------------------------------------

interface FeatureFlagsCardProps {
  texts?: Partial<AuthSettingsSectionFeatureFlagsTexts>
}

function FeatureFlagsCard({ texts }: FeatureFlagsCardProps) {
  const t: AuthSettingsSectionFeatureFlagsTexts = { ...DEFAULT_FEATURE_FLAGS_TEXTS, ...texts }
  const flagsQuery = useFeatureFlags()
  const updateMutation = useUpdateFeatureFlag({
    onSuccess: () => toast.success(t.toggleSuccess),
    onError: () => toast.error(t.toggleError),
  })

  const handleToggle = useCallback(
    (flag: FeatureFlag, next: boolean) => {
      updateMutation.mutate({
        key: flag.key,
        body: {
          enabled: next,
          scope: flag.scope,
          ...(flag.appName ? { appName: flag.appName } : {}),
          ...(flag.description !== undefined ? { description: flag.description } : {}),
        },
      })
    },
    [updateMutation]
  )

  const columns: ColumnDef<FeatureFlag>[] = [
    {
      accessorKey: 'key',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnKey} />,
      cell: ({ row }) => <Span className="font-mono text-sm font-medium">{row.original.key}</Span>,
    },
    {
      accessorKey: 'description',
      header: t.columnDescription,
      enableSorting: false,
      cell: ({ row }) => {
        const desc = row.original.description
        return desc ? (
          <Span className="text-sm text-muted-foreground">{desc}</Span>
        ) : (
          <Span className="text-sm text-muted-foreground">-</Span>
        )
      },
    },
    {
      accessorKey: 'scope',
      header: t.columnScope,
      cell: ({ row }) => {
        const scope = row.original.scope
        return scope === 'app' ? (
          <Badge variant="secondary" size="sm">
            {t.scopeApp}
            {row.original.appName ? `:${row.original.appName}` : ''}
          </Badge>
        ) : (
          <Badge variant="outline" size="sm">
            {t.scopeGlobal}
          </Badge>
        )
      },
    },
    {
      id: 'status',
      header: t.columnStatus,
      enableSorting: false,
      cell: ({ row }) => (
        <Badge variant={row.original.enabled ? 'success' : 'outline'} size="sm">
          {row.original.enabled ? t.enabled : t.disabled}
        </Badge>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: ({ header }) => <DataTableColumnHeader header={header} title={t.columnUpdatedAt} />,
      cell: ({ row }) => (
        <Span className="text-sm text-muted-foreground">
          {new Intl.DateTimeFormat('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(row.original.updatedAt))}
        </Span>
      ),
    },
    {
      id: 'actions',
      header: t.columnActions,
      enableSorting: false,
      cell: ({ row }) => (
        <Switch
          checked={row.original.enabled}
          onCheckedChange={(checked: boolean) => handleToggle(row.original, checked)}
          disabled={updateMutation.isPending}
          aria-label={`${t.columnActions}: ${row.original.key}`}
        />
      ),
    },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {flagsQuery.isLoading ? (
          <Div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </Div>
        ) : !flagsQuery.data || flagsQuery.data.length === 0 ? (
          <P className="text-center text-muted-foreground py-8">{t.empty}</P>
        ) : (
          <DataTable columns={columns} data={flagsQuery.data} pageSize={10} />
        )}
        {updateMutation.isPending && (
          <Span className="sr-only" role="status">
            {t.loading}
          </Span>
        )}
        <Div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => flagsQuery.refetch()}
            disabled={flagsQuery.isFetching}
          >
            {t.refresh}
          </Button>
        </Div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Maintenance mode sub-card
// ---------------------------------------------------------------------------

interface MaintenanceCardProps {
  texts?: Partial<AuthSettingsSectionMaintenanceTexts>
}

function MaintenanceCard({ texts }: MaintenanceCardProps) {
  const t: AuthSettingsSectionMaintenanceTexts = { ...DEFAULT_MAINTENANCE_TEXTS, ...texts }
  const query = useMaintenanceMode()
  const mutation = useUpdateMaintenanceMode({
    onSuccess: () => toast.success(t.saveSuccess),
    onError: () => toast.error(t.saveError),
  })

  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('')
  const [scheduledEnd, setScheduledEnd] = useState('')

  // Sync local form state from server when query resolves / refetches.
  useEffect(() => {
    if (!query.data) return
    setEnabled(query.data.enabled)
    setMessage(query.data.message ?? '')
    setScheduledEnd(toDatetimeLocal(query.data.scheduledEnd))
  }, [query.data])

  const startedAtLabel = useMemo(() => {
    if (!query.data?.startedAt) return t.notSet
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(query.data.startedAt))
    } catch {
      return t.notSet
    }
  }, [query.data?.startedAt, t.notSet])

  const handleSave = () => {
    mutation.mutate({
      enabled,
      message,
      scheduledEnd: fromDatetimeLocal(scheduledEnd),
    })
  }

  const handleToggleQuick = (next: boolean) => {
    setEnabled(next)
    mutation.mutate({
      enabled: next,
      message,
      scheduledEnd: fromDatetimeLocal(scheduledEnd),
    })
  }

  if (query.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </Div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-start justify-between gap-3">
          <Div className="space-y-1">
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </Div>
          <Badge variant={query.data?.enabled ? 'destructive' : 'outline'} size="sm">
            {query.data?.enabled ? t.enabledBadge : t.disabledBadge}
          </Badge>
        </Div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Div className="flex items-center justify-between gap-3 rounded-md border p-3">
          <Div className="space-y-0.5">
            <P className="text-sm font-medium">{enabled ? t.disable : t.enable}</P>
            <P className="text-xs text-muted-foreground">
              {t.startedAt}: <Span className="font-mono">{startedAtLabel}</Span>
            </P>
          </Div>
          <Switch
            checked={enabled}
            onCheckedChange={handleToggleQuick}
            disabled={mutation.isPending}
            aria-label={t.title}
          />
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="maintenance-message">{t.message}</Label>
          <Textarea
            id="maintenance-message"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={t.messagePlaceholder}
            maxLength={1000}
            showCharCount
            disabled={mutation.isPending}
          />
        </Div>

        <Div className="space-y-2">
          <Label htmlFor="maintenance-scheduled-end">{t.scheduledEnd}</Label>
          <Input
            id="maintenance-scheduled-end"
            type="datetime-local"
            value={scheduledEnd}
            onChange={e => setScheduledEnd(e.target.value)}
            disabled={mutation.isPending}
          />
          <P className="text-xs text-muted-foreground">{t.scheduledEndHelp}</P>
        </Div>
      </CardContent>

      <CardFooter className="flex justify-end gap-2">
        <Button
          type="button"
          variant={enabled ? 'destructive' : 'default'}
          onClick={handleSave}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <>
              <Spinner size="sm" className="mr-2" />
              {t.saving}
            </>
          ) : enabled ? (
            t.enableButton
          ) : (
            t.saveButton
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
