'use client'

/**
 * Admin section: maintenance-mode singleton editor.
 *
 * Drop-in component for any admin dashboard. Federated-friendly via
 * `apiUrl` / `authToken` props (Tier 3 hub embeds).
 */

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
import { useMaintenanceMode, useUpdateMaintenanceMode } from '../../react/maintenance-mode.js'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AdminMaintenanceModeSectionTexts {
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

export interface AdminMaintenanceModeSectionProps {
  /** Override the EZAuth API base URL (federated admin embeds). */
  apiUrl?: string
  /** Bearer token (federated embeds where the hub holds the platform-wide JWT). */
  authToken?: string | (() => string | Promise<string>)
  /** Override default English labels. */
  texts?: Partial<AdminMaintenanceModeSectionTexts>
  className?: string
}

// ─── Defaults ───────────────────────────────────────────────────────────────

const DEFAULT_TEXTS: AdminMaintenanceModeSectionTexts = {
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

// ─── Helpers ────────────────────────────────────────────────────────────────

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

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Admin section to enable/disable platform maintenance mode and configure
 * the banner message + scheduled end.
 *
 * @example
 * ```tsx
 * <AdminMaintenanceModeSection />
 * ```
 */
export function AdminMaintenanceModeSection({
  apiUrl,
  authToken,
  texts,
  className,
}: AdminMaintenanceModeSectionProps) {
  const t: AdminMaintenanceModeSectionTexts = { ...DEFAULT_TEXTS, ...texts }
  const query = useMaintenanceMode({ apiUrl, authToken })
  const mutation = useUpdateMaintenanceMode({
    apiUrl,
    authToken,
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
      <Card className={className}>
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
    <Card className={className}>
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
