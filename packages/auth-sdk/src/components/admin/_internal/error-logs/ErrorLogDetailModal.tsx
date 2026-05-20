'use client'

import {
  Badge,
  Button,
  Div,
  Icon,
  Label,
  Modal,
  P,
  Pre,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { useAdminErrorLogDetail } from '../../../../react/admin-error-logs.js'
import type { AuthErrorLogsSectionTexts } from './texts.js'
import { formatDate, levelBadgeVariant, statusBadgeVariant } from './helpers.js'

interface ErrorLogDetailModalProps {
  id: string
  texts: Required<AuthErrorLogsSectionTexts>
  locale: string
  apiUrl?: string
  authToken?: string | (() => string | Promise<string>)
  onClose: () => void
}

/**
 * Modal that fetches and renders the full stack + context of a single error
 * log entry. Opened from the error logs table "View" action.
 *
 * @internal
 */
export function ErrorLogDetailModal({
  id,
  texts,
  locale,
  apiUrl,
  authToken,
  onClose,
}: ErrorLogDetailModalProps) {
  const { data, isLoading, isError } = useAdminErrorLogDetail(id, {
    ...(apiUrl ? { apiUrl } : {}),
    ...(authToken !== undefined ? { authToken } : {}),
  })

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="xl"
      title={texts.detailTitle}
      footer={
        <Button type="button" variant="outline" onClick={onClose}>
          {texts.closeButton}
        </Button>
      }
    >
      {isLoading ? (
        <Div
          className="flex items-center justify-center py-8"
          role="status"
          aria-busy="true"
          aria-label={texts.loading}
        >
          <Spinner variant="primary" size="lg" />
        </Div>
      ) : isError || !data ? (
        <Div className="flex flex-col items-center gap-3 py-8 text-center">
          <Icon name="lucide:AlertTriangle" className="h-10 w-10 text-destructive" />
          <P className="text-sm text-destructive">{texts.loadError}</P>
        </Div>
      ) : (
        <Div className="space-y-4">
          <Div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <DetailField label={texts.columnTimestamp}>
              {formatDate(data.timestamp, locale)}
            </DetailField>
            <DetailField label={texts.columnLevel}>
              <Badge variant={levelBadgeVariant(data.level)} size="xs">
                {data.level}
              </Badge>
            </DetailField>
            <DetailField label={texts.detailErrorName}>{data.errorName ?? '—'}</DetailField>
            <DetailField label={texts.columnStatus}>
              {data.statusCode ? (
                <Badge variant={statusBadgeVariant(data.statusCode)} size="xs">
                  {data.statusCode}
                </Badge>
              ) : (
                '—'
              )}
            </DetailField>
            <DetailField label={texts.columnMethod}>
              <Span className="font-mono text-xs">{data.method ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.columnUrl}>
              <Span className="font-mono text-xs break-all">{data.url ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.columnUser}>
              <Span className="font-mono text-xs">{data.userId ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.detailIp}>
              <Span className="font-mono text-xs">{data.ip ?? '—'}</Span>
            </DetailField>
            <DetailField label={texts.detailEnv}>{data.env ?? '—'}</DetailField>
            <DetailField label={texts.detailRelease}>
              <Span className="font-mono text-xs">{data.releaseSha ?? '—'}</Span>
            </DetailField>
            {data.userAgent && (
              <DetailField label={texts.detailUserAgent} className="sm:col-span-2">
                <Span className="text-xs text-muted-foreground break-all">{data.userAgent}</Span>
              </DetailField>
            )}
          </Div>

          <Div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {texts.detailMessage}
            </Label>
            <Pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {data.message}
            </Pre>
          </Div>

          <Div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">{texts.detailStack}</Label>
            <Pre className="text-[11px] bg-muted rounded-md p-3 overflow-x-auto max-h-[400px] whitespace-pre-wrap break-all">
              {data.stack ?? texts.detailNoStack}
            </Pre>
          </Div>

          <Div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {texts.detailContext}
            </Label>
            <Pre className="text-xs bg-muted rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
              {data.context ? JSON.stringify(data.context, null, 2) : texts.detailNoContext}
            </Pre>
          </Div>
        </Div>
      )}
    </Modal>
  )
}

interface DetailFieldProps {
  label: string
  children: React.ReactNode
  className?: string
}

function DetailField({ label, children, className }: DetailFieldProps) {
  return (
    <Div className={className}>
      <P className="text-xs font-medium text-muted-foreground mb-0.5">{label}</P>
      <Div className="text-sm text-foreground">{children}</Div>
    </Div>
  )
}
