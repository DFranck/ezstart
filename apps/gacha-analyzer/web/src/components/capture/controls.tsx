'use client'

import { Button, Card, Div, P } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface CaptureControlsProps {
  isCapturing: boolean
  isAnalyzing: boolean
  error: string | null
  onStart: () => void
  onStop: () => void
  extraButtons?: React.ReactNode
}

export function CaptureControls({
  isCapturing,
  isAnalyzing,
  error,
  onStart,
  onStop,
  extraButtons,
}: CaptureControlsProps) {
  const t = useTranslations('scan')

  const statusText = (() => {
    if (error) return error
    if (isAnalyzing) return t('capture.analyzing')
    if (isCapturing) return t('capture.waitingForChange')
    return t('capture.selectWindow')
  })()

  const statusColor = isAnalyzing
    ? 'text-warning-foreground'
    : isCapturing
      ? 'text-success-foreground'
      : error
        ? 'text-destructive-foreground'
        : 'text-muted-foreground'

  if (isCapturing) {
    return (
      <Div className="flex items-center justify-between">
        <Div className="flex items-center gap-2">
          <Div
            className={`h-2 w-2 rounded-full ${isAnalyzing ? 'bg-warning animate-pulse' : 'bg-success'}`}
          />
          <P className={`text-sm ${statusColor}`}>{statusText}</P>
        </Div>
        <Button size="sm" variant="outline" onClick={onStop} className="text-xs">
          {t('capture.stop')}
        </Button>
      </Div>
    )
  }

  return (
    <>
      {error && <P className={`text-sm ${statusColor}`}>{statusText}</P>}
      <Div className="flex items-center gap-2">
        <Button className="flex-1 h-12 text-base font-semibold" variant="default" onClick={onStart}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-2"
          >
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" />
          </svg>
          {t('capture.start')}
        </Button>
        {extraButtons}
      </Div>
    </>
  )
}

export function EmptyPreview() {
  const t = useTranslations('scan')

  return (
    <Card className="bg-muted border-dashed border-2 border-border">
      <Div className="aspect-video flex flex-col items-center justify-center gap-3 px-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground/40"
        >
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <polyline points="10 17 15 12 10 7" />
          <line x1="15" x2="3" y1="12" y2="12" />
        </svg>
        <P className="text-muted-foreground text-sm text-center">{t('capture.selectWindow')}</P>
      </Div>
    </Card>
  )
}

export function NotSupportedMessage() {
  const t = useTranslations('scan')

  return (
    <Card className="p-6 text-center">
      <P className="text-muted-foreground">{t('capture.notSupported')}</P>
    </Card>
  )
}
