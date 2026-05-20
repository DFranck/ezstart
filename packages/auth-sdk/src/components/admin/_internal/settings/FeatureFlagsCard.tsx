'use client'

import { useCallback } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type ColumnDef,
  DataTable,
  DataTableColumnHeader,
  Div,
  P,
  Skeleton,
  Span,
  Switch,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useFeatureFlags, useUpdateFeatureFlag } from '../../../../react/feature-flags.js'
import type { FeatureFlag } from '../../../../core/types.js'
import { type AuthSettingsSectionFeatureFlagsTexts, DEFAULT_FEATURE_FLAGS_TEXTS } from './texts.js'

interface FeatureFlagsCardProps {
  texts?: Partial<AuthSettingsSectionFeatureFlagsTexts>
}

/**
 * Feature flags toggle table. Auto-scoped server-side via JWT.
 *
 * @internal
 */
export function FeatureFlagsCard({ texts }: FeatureFlagsCardProps) {
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
