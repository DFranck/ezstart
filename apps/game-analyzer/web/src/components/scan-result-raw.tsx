'use client'

import { Card, CardContent, CardHeader, Div, H3, P } from '@ezstart/ui/components'

interface ScanResultRawProps {
  rawText: string
  confidence: number
  parsingFailed: boolean
}

export function ScanResultRaw({ rawText, confidence, parsingFailed }: ScanResultRawProps) {
  const confidencePercent = Math.round(confidence)

  return (
    <Card>
      <CardHeader>
        <Div className="flex items-center justify-between">
          <H3 className="text-lg font-semibold">OCR Result</H3>
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
            <P className="text-sm text-muted-foreground">
              {confidencePercent}% confidence
            </P>
          </Div>
        </Div>
      </CardHeader>
      <CardContent className="space-y-3">
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
