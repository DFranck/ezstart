'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, Div, P } from '@ezstart/ui/components'
import type { OcrSource } from '@game-analyzer/types'

interface OcrDebugPanelProps {
  previews: { name: string; dataUrl: string }[]
  sources?: OcrSource[]
  mergedConfidence: number
  mergedSubs: number
}

const SOURCE_LABELS: Record<string, string> = {
  'zoom-preprocessed': 'Zoom Preprocessed',
  'zoom-raw': 'Zoom Raw',
  'full-crop': 'Full Window Crop',
}

function SourceDetails({ source }: { source: OcrSource }) {
  const t = useTranslations()
  return (
    <Div className="space-y-1">
      <Div className="flex items-center gap-2">
        <Div
          className={`h-2 w-2 rounded-full ${
            source.confidence >= 80
              ? 'bg-green-500'
              : source.confidence >= 50
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
        />
        <P className="text-xs text-muted-foreground">
          {Math.round(source.confidence)}% confidence
        </P>
      </Div>
      <P className="text-xs text-muted-foreground">
        {source.subsFound} {t('scan.subsFound')}
      </P>
      <Div className="rounded bg-muted p-2 max-h-32 overflow-auto">
        <pre className="text-[10px] whitespace-pre-wrap break-words font-mono text-muted-foreground">
          {source.rawText || '(empty)'}
        </pre>
      </Div>
    </Div>
  )
}

export function OcrDebugPanel({ previews, sources, mergedConfidence, mergedSubs }: OcrDebugPanelProps) {
  const t = useTranslations()
  const [open, setOpen] = useState(false)

  if (previews.length === 0 && (!sources || sources.length === 0)) return null

  const sourceCount = sources?.length || previews.length

  return (
    <Card>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-muted/50 transition-colors"
      >
        <Div className="flex items-center gap-2">
          <span className="text-xs">{open ? '\u25BC' : '\u25B6'}</span>
          <span>{t('scan.debugOcr')} ({sourceCount} {t('scan.sources')})</span>
        </Div>
        <P className="text-xs text-muted-foreground">
          {t('scan.mergedResult')}: {mergedSubs} {t('scan.subsFound')}, {Math.round(mergedConfidence)}% confidence
        </P>
      </button>

      {open && (
        <CardContent className="pt-0">
          <Div className={`grid grid-cols-1 ${sourceCount <= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
            {/* When we have previews, render them with matched sources */}
            {previews.length > 0 && previews.map((preview, idx) => {
              const source = sources?.[idx]
              const label = source ? (SOURCE_LABELS[source.name] || source.name) : preview.name

              return (
                <Div key={preview.name} className="space-y-2 border rounded-lg p-3">
                  <P className="text-xs font-semibold">{label}</P>

                  <img
                    src={preview.dataUrl}
                    alt={label}
                    className="w-full border rounded bg-black/5"
                  />

                  {source && (
                    <SourceDetails source={source} />
                  )}
                </Div>
              )
            })}

            {/* When no previews (upload mode), render sources directly */}
            {previews.length === 0 && sources?.map((source) => {
              const label = SOURCE_LABELS[source.name] || source.name

              return (
                <Div key={source.name} className="space-y-2 border rounded-lg p-3">
                  <P className="text-xs font-semibold">{label}</P>
                  <SourceDetails source={source} />
                </Div>
              )
            })}
          </Div>
        </CardContent>
      )}
    </Card>
  )
}
