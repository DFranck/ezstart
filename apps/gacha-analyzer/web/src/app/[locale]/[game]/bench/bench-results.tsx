'use client'

import { Button, Div, H2, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import type { ScanResult } from '@gacha-analyzer/types'
import { OcrDebugPanel } from '@/components/ocr-debug-panel'

interface BenchResultsProps {
  resultData: ScanResult | undefined
  ocrPreviews: { name: string; dataUrl: string }[]
  presetsSaved: boolean
  onSavePresets: () => void
}

export function BenchResults({
  resultData,
  ocrPreviews,
  presetsSaved,
  onSavePresets,
}: BenchResultsProps) {
  const t = useTranslations()

  if (!resultData) return null

  return (
    <Div className="space-y-4">
      {/* Merged result summary */}
      <Div className="rounded-md bg-muted/50 border px-3 py-2">
        <P className="text-sm font-medium">
          {t('labels.confidence')}: {resultData.confidence}%
          {resultData.rawText && (
            <Span className="ml-4 text-muted-foreground">
              Raw: {resultData.rawText.substring(0, 120)}
              {resultData.rawText.length > 120 ? '...' : ''}
            </Span>
          )}
        </P>
      </Div>

      {/* Bench results table */}
      {resultData.benchResults && resultData.benchResults.length > 0 && (
        <Div className="space-y-3">
          <H2 className="text-lg font-semibold">{t('bench.results')}</H2>
          <Div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium">{t('bench.source')}</th>
                  <th className="text-left py-2 px-3 font-medium">{t('bench.preset')}</th>
                  <th className="text-right py-2 px-3 font-medium">{t('labels.confidence')}</th>
                  <th className="text-right py-2 px-3 font-medium">{t('bench.substats')}</th>
                  <th className="text-center py-2 px-3 font-medium">{t('bench.status')}</th>
                </tr>
              </thead>
              <tbody>
                {resultData.benchResults.map((r, idx) => (
                  <tr
                    key={`${r.source}-${r.preset}-${idx}`}
                    className={`border-b ${idx === 0 ? 'bg-primary/5' : ''}`}
                  >
                    <td className="py-2 px-3 font-mono text-xs">{r.source}</td>
                    <td className="py-2 px-3 font-mono text-xs">
                      {r.preset}
                      {idx === 0 && (
                        <Span className="ml-2 text-xs text-primary font-medium">BEST</Span>
                      )}
                    </td>
                    <td className="text-right py-2 px-3">{r.confidence}%</td>
                    <td className="text-right py-2 px-3">{r.subsCount}</td>
                    <td className="text-center py-2 px-3">
                      {r.success ? (
                        <Span className="text-success-foreground">OK</Span>
                      ) : (
                        <Span className="text-destructive-foreground">FAIL</Span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Div>

          {/* Save best presets button */}
          <Button
            variant={presetsSaved ? 'outline' : 'default'}
            className="w-full"
            onClick={onSavePresets}
            disabled={presetsSaved}
          >
            {presetsSaved ? t('bench.presetsSaved') : t('bench.savePresets')}
          </Button>
        </Div>
      )}

      {/* OCR debug panel */}
      {ocrPreviews.length > 0 && (
        <OcrDebugPanel
          previews={ocrPreviews}
          sources={resultData.ocrSources}
          mergedConfidence={resultData.confidence}
          mergedSubs={resultData.benchResults?.find(r => r.success)?.subsCount ?? 0}
        />
      )}
    </Div>
  )
}
