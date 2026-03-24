'use client'

import { Button, Card, CardContent, CardHeader, Div, H3, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface ScanResultRawProps {
  rawText: string
  confidence: number
  parsingFailed: boolean
  /** When true, the raw OCR text is hidden by default behind a toggle button */
  defaultCollapsed?: boolean
}

export function ScanResultRaw({ rawText, confidence, parsingFailed, defaultCollapsed = false }: ScanResultRawProps) {
  const t = useTranslations('scan')
  const confidencePercent = Math.round(confidence)
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  // When collapsed and parsing succeeded, show just a toggle button
  if (collapsed && !parsingFailed) {
    return (
      <Div className="mt-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(false)}
          className="text-xs text-muted-foreground hover:text-foreground w-full"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
          {t('showRawOcr')}
        </Button>
      </Div>
    )
  }

  return (
    <Card className="mt-3">
      <CardHeader className="pb-2 px-3 pt-3">
        <Div className="flex items-center justify-between">
          <H3 className="text-sm font-semibold">OCR Result</H3>
          <Div className="flex items-center gap-2">
            <Div
              className={`h-2 w-2 rounded-full ${
                confidencePercent >= 80
                  ? 'bg-green-500'
                  : confidencePercent >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            <P className="text-xs text-muted-foreground">
              {confidencePercent}%
            </P>
            {defaultCollapsed && !parsingFailed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(true)}
                className="text-xs text-muted-foreground h-6 px-2"
              >
                {t('hideRawOcr')}
              </Button>
            )}
          </Div>
        </Div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3">
        {parsingFailed && (
          <Div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
            <P className="text-sm text-destructive font-medium">
              Parsing failed — raw OCR text shown below
            </P>
          </Div>
        )}
        <Div className="rounded-md bg-muted p-3">
          <pre className="text-xs whitespace-pre-wrap break-words font-mono text-muted-foreground">
            {rawText}
          </pre>
        </Div>
      </CardContent>
    </Card>
  )
}
