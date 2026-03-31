'use client'

import { Badge, Button, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { GameType, ScanResult } from '@gacha-analyzer/types'
import type { RuneCardTemplate } from '@/components/rune-card-templates'
import { RuneCardWithTemplate } from '@/components/rune-card-templates'
import { GearCard } from '@/components/gear-card'
import { ScanResultRaw } from '@/components/scan-result-raw'

interface ScanResultsProps {
  game: GameType
  resultData: ScanResult | undefined
  isPending: boolean
  isCapturing: boolean
  isCachedDisplay: boolean
  scanCount: number
  currentLayoutName: string
  runeTemplate: RuneCardTemplate
  onTemplateChange: (t: RuneCardTemplate) => void
}

export function ScanResults({
  game,
  resultData,
  isPending,
  isCapturing,
  isCachedDisplay,
  scanCount,
  currentLayoutName,
  runeTemplate,
  onTemplateChange,
}: ScanResultsProps) {
  const t = useTranslations()

  const hasStructuredData = resultData?.data && Object.keys(resultData.data).length > 0

  return (
    <Div className="space-y-4">
      {/* Template selector — always visible for SW */}
      {game === 'summoners-war' && (
        <Div className="flex gap-1.5">
          {(['compact', 'detailed', 'gaming'] as const).map(tmpl => (
            <Button
              key={tmpl}
              variant={runeTemplate === tmpl ? 'default' : 'outline'}
              size="sm"
              className="text-xs capitalize"
              onClick={() => onTemplateChange(tmpl)}
            >
              {tmpl}
            </Button>
          ))}
        </Div>
      )}

      {/* Rune card — skeleton when no result, real content when available */}
      {game === 'summoners-war' && (
        <Div
          className={
            resultData && hasStructuredData && resultData.success && 'set' in resultData.data
              ? 'animate-in fade-in-0 duration-300'
              : ''
          }
        >
          <RuneCardWithTemplate
            rune={
              hasStructuredData && resultData?.success && 'set' in resultData.data
                ? resultData.data
                : undefined
            }
            analysis={resultData?.analysis}
            confidence={resultData?.confidence}
            template={runeTemplate}
            isLoading={isPending}
          />
        </Div>
      )}

      {resultData && (
        <Div
          className={
            isPending
              ? 'opacity-50 pointer-events-none'
              : 'animate-in fade-in-0 slide-in-from-bottom-2 duration-300'
          }
        >
          {resultData.unreliable && (
            <Div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2 mb-3">
              <P className="text-sm text-warning-foreground">{t('scan.unreliableResult')}</P>
            </Div>
          )}

          {hasStructuredData && resultData.success && 'manufacturer' in resultData.data && (
            <GearCard gear={resultData.data} confidence={resultData.confidence} />
          )}

          {resultData.rawText && (
            <ScanResultRaw
              rawText={resultData.rawText}
              confidence={resultData.confidence}
              parsingFailed={!hasStructuredData}
              defaultCollapsed={hasStructuredData}
            />
          )}

          {!hasStructuredData && resultData.rawText && (
            <Div className="rounded-md bg-warning/10 border border-warning/20 px-3 py-2">
              <P className="text-sm text-warning-foreground">
                {t('scan.parsingImproving', {
                  defaultMessage:
                    'Structured parsing is being improved. Raw OCR text is shown above.',
                })}
              </P>
            </Div>
          )}
        </Div>
      )}

      {!resultData && !isPending && isCapturing && game !== 'summoners-war' && (
        <Div className="text-center py-8">
          <P className="text-muted-foreground text-sm">{t('scan.capture.waitingForChange')}</P>
        </Div>
      )}
    </Div>
  )
}

interface ScanStatusBarProps {
  currentLayoutName: string
  resultData: ScanResult | undefined
  isCachedDisplay: boolean
  scanCount: number
}

export function ScanStatusBar({
  currentLayoutName,
  resultData,
  isCachedDisplay,
  scanCount,
}: ScanStatusBarProps) {
  const t = useTranslations()

  return (
    <Div className="flex items-center gap-2 flex-wrap">
      {currentLayoutName && (
        <Badge variant="outline" className="text-xs">
          {t('scan.statusBar.layout')}: {currentLayoutName}
        </Badge>
      )}
      {resultData?.confidence !== undefined && (
        <Badge variant="outline" className="text-xs">
          <Div
            className={`h-1.5 w-1.5 rounded-full mr-1 ${
              resultData.confidence >= 80
                ? 'bg-success'
                : resultData.confidence >= 50
                  ? 'bg-warning'
                  : 'bg-destructive'
            }`}
          />
          {t('scan.statusBar.lastConfidence')}: {Math.round(resultData.confidence)}%
        </Badge>
      )}
      {isCachedDisplay && (
        <Badge variant="secondary" className="text-xs">
          Cached
        </Badge>
      )}
      {scanCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {scanCount} {t('scan.statusBar.scans')}
        </Badge>
      )}
    </Div>
  )
}
