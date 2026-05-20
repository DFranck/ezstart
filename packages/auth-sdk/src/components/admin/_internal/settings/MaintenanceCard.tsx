'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { useMaintenanceMode, useUpdateMaintenanceMode } from '../../../../react/maintenance-mode.js'
import { type AuthSettingsSectionMaintenanceTexts, DEFAULT_MAINTENANCE_TEXTS } from './texts.js'
import { fromDatetimeLocal, toDatetimeLocal } from './datetime.js'

interface MaintenanceCardProps {
  texts?: Partial<AuthSettingsSectionMaintenanceTexts>
}

/**
 * Maintenance mode singleton editor. Toggling shows a platform-wide banner.
 * Auto-scoped server-side via JWT.
 *
 * @internal
 */
export function MaintenanceCard({ texts }: MaintenanceCardProps) {
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
