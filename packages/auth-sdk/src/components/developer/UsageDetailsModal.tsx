'use client'

import {
  Badge,
  Button,
  Card,
  CardContent,
  Div,
  H3,
  Modal,
  P,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { useApiKeyUsage } from '../../react/api-keys.js'
import type { UsageDetailsModalTexts } from './types.js'
import { UsageBadge } from './UsageBadge.js'

export interface UsageDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  keyId: string | null
  keyName: string
  texts: UsageDetailsModalTexts
}

function getBarColor(used: number, limit: number): string {
  const pct = limit > 0 ? (used / limit) * 100 : 0
  if (pct >= 80) return 'bg-destructive'
  if (pct >= 50) return 'bg-warning'
  return 'bg-success'
}

function interpolate(template: string, values: Record<string, string | number>): string {
  let result = template
  for (const [key, val] of Object.entries(values)) {
    result = result.replace(`{${key}}`, String(val))
  }
  return result
}

/**
 * Modal showing per-key usage breakdown (request count over time, by
 * endpoint) for a specific API key.
 *
 * @example
 * ```tsx
 * <UsageDetailsModal isOpen={open} onClose={close} keyId={selectedKey.id} keyName={selectedKey.name} texts={texts} />
 * ```
 */
export function UsageDetailsModal({
  isOpen,
  onClose,
  keyId,
  keyName,
  texts,
}: UsageDetailsModalProps) {
  const { data, isLoading, isError } = useApiKeyUsage(keyId, isOpen)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={interpolate(texts.detailsTitle, { name: keyName })}
      description={texts.detailsDescription}
      footer={
        <Button variant="outline" onClick={onClose}>
          {texts.close}
        </Button>
      }
    >
      {isLoading && (
        <Div className="flex justify-center py-8">
          <Spinner variant="primary" size="default" />
        </Div>
      )}

      {isError && <P className="text-destructive text-center py-4">{texts.fetchError}</P>}

      {data && (
        <Div className="space-y-6">
          {/* Quota overview */}
          <Card variant="ghost">
            <CardContent className="pt-4">
              <Div className="flex items-center justify-between">
                <Div>
                  <H3 size="h4">{texts.quotaTitle}</H3>
                  <P className="text-muted-foreground text-sm">
                    {data.quota.limit !== null
                      ? interpolate(texts.quotaLabel, {
                          used: data.quota.used,
                          limit: data.quota.limit,
                        })
                      : texts.unlimited}
                  </P>
                </Div>
                <UsageBadge
                  used={data.quota.used}
                  quota={data.quota.limit}
                  texts={{ unlimited: texts.unlimited }}
                />
              </Div>
              {data.quota.limit !== null && (
                <Div className="mt-3 w-full h-3 rounded-full bg-muted overflow-hidden">
                  <Div
                    className={`h-full rounded-full transition-all ${getBarColor(
                      data.quota.used,
                      data.quota.limit
                    )}`}
                    style={{
                      width: `${String(Math.min(100, Math.round((data.quota.used / data.quota.limit) * 100)))}%`,
                    }}
                  />
                </Div>
              )}
              {data.quota.remaining !== null && (
                <P className="text-muted-foreground text-xs mt-1">
                  {interpolate(texts.remaining, { count: data.quota.remaining })}
                </P>
              )}
            </CardContent>
          </Card>

          {/* Top endpoints */}
          {data.currentMonth.topEndpoints.length > 0 && (
            <Div>
              <H3 size="h4" className="mb-2">
                {texts.topEndpoints}
              </H3>
              <Div className="space-y-1">
                {data.currentMonth.topEndpoints.map(ep => (
                  <Div
                    key={ep.endpoint}
                    className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/50"
                  >
                    <Span className="text-sm font-mono text-foreground truncate mr-2">
                      {ep.endpoint}
                    </Span>
                    <Badge variant="outline" size="xs">
                      {ep.count}
                    </Badge>
                  </Div>
                ))}
              </Div>
            </Div>
          )}

          {/* Daily breakdown */}
          {data.daily.length > 0 && (
            <Div>
              <H3 size="h4" className="mb-2">
                {texts.dailyBreakdown}
              </H3>
              <Div className="space-y-0.5">
                {data.daily.slice(-14).map(day => {
                  const maxCount = Math.max(...data.daily.map(d => d.requestCount), 1)
                  const widthPct = Math.max(2, Math.round((day.requestCount / maxCount) * 100))
                  return (
                    <Div key={day.date} className="flex items-center gap-2">
                      <Span className="text-xs text-muted-foreground w-20 shrink-0">
                        {day.date.slice(5)}
                      </Span>
                      <Div className="flex-1 h-4 rounded bg-muted overflow-hidden">
                        <Div
                          className="h-full rounded bg-primary/70"
                          style={{ width: `${String(widthPct)}%` }}
                        />
                      </Div>
                      <Span className="text-xs text-muted-foreground w-10 text-right">
                        {day.requestCount}
                      </Span>
                    </Div>
                  )
                })}
              </Div>
            </Div>
          )}

          {data.daily.length === 0 && data.currentMonth.requestCount === 0 && (
            <P className="text-muted-foreground text-center py-4">{texts.noUsage}</P>
          )}
        </Div>
      )}
    </Modal>
  )
}
