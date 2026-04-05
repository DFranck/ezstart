'use client'

import { logger } from '@ezstart/logger'
import { Button, Div, Icon, P, Span } from '@ezstart/ui/components'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { QRCodeConfig } from '../types'

interface QRCodeCanvasProps {
  config: QRCodeConfig
}

export function QRCodeCanvas({ config }: QRCodeCanvasProps) {
  const t = useSafeTranslations('qrCode')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrCode, setQRCode] = useState<any>(null)

  useEffect(() => {
    import('qrcode').then(QRCode => {
      setQRCode(() => QRCode.default)
    })
  }, [])

  useEffect(() => {
    if (!qrCode || !canvasRef.current || !config.url) return

    qrCode.toCanvas(
      canvasRef.current,
      config.url,
      {
        width: config.size,
        margin: config.includeMargin ? 4 : 0,
        color: {
          dark: config.foregroundColor,
          light: config.backgroundColor,
        },
        errorCorrectionLevel: config.errorCorrectionLevel,
      },
      (error: Error) => {
        if (error) logger.error('QR Code generation error:', error)
      }
    )
  }, [qrCode, config])

  const handleDownload = (format: 'png' | 'svg') => {
    if (!canvasRef.current || !config.url) return

    if (format === 'png') {
      const url = canvasRef.current.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `qrcode-${Date.now()}.png`
      link.href = url
      link.click()
      toast.success(t('generator.preview.downloadSuccess'))
    } else if (format === 'svg') {
      if (!qrCode) return

      qrCode.toString(
        config.url,
        {
          type: 'svg',
          width: config.size,
          margin: config.includeMargin ? 4 : 0,
          color: {
            dark: config.foregroundColor,
            light: config.backgroundColor,
          },
          errorCorrectionLevel: config.errorCorrectionLevel,
        },
        (error: Error, svgString: string) => {
          if (error) {
            logger.error('SVG generation error:', error)
            return
          }
          const blob = new Blob([svgString], { type: 'image/svg+xml' })
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.download = `qrcode-${Date.now()}.svg`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
          toast.success(t('generator.preview.downloadSuccess'))
        }
      )
    }
  }

  const handleCopyImage = async () => {
    if (!canvasRef.current || !config.url) return

    try {
      const blob = await new Promise<Blob>(resolve => {
        canvasRef.current!.toBlob(blob => resolve(blob!), 'image/png')
      })

      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      toast.success(t('generator.preview.copied'))
    } catch (error) {
      logger.error('Failed to copy image:', error)
      toast.error(t('generator.preview.copyError'))
    }
  }

  if (!config.url) {
    return (
      <Div layout="center" className="min-h-[320px] border border-dashed border-border rounded-lg bg-muted/30">
        <Icon name="lucide:QrCode" className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <P className="text-muted-foreground">{t('generator.preview.emptyState')}</P>
      </Div>
    )
  }

  return (
    <Div className="space-y-4">
      {/* Canvas Preview */}
      <Div layout="center" className="p-6 bg-muted/30 rounded-lg">
        <canvas
          ref={canvasRef}
          className="rounded-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </Div>

      {/* Download & Copy Actions */}
      <Div className="flex flex-wrap gap-2">
        <Button onClick={() => handleDownload('png')} variant="default" className="flex-1">
          <Icon name="lucide:Download" size={16} ariaHidden />
          <Span className="ml-2">{t('generator.preview.downloadPng')}</Span>
        </Button>
        <Button onClick={() => handleDownload('svg')} variant="default" className="flex-1">
          <Icon name="lucide:Download" size={16} ariaHidden />
          <Span className="ml-2">{t('generator.preview.downloadSvg')}</Span>
        </Button>
      </Div>
      <Button onClick={handleCopyImage} variant="outline" className="w-full">
        <Icon name="lucide:Copy" size={16} ariaHidden />
        <Span className="ml-2">{t('generator.preview.copyToClipboard')}</Span>
      </Button>

      {/* Redirect Info */}
      {config.redirectType === 'temporary' && (
        <Div variant="card" size="sm" className="text-sm bg-muted/30 rounded-lg">
          <Icon name="lucide:Info" size={16} className="inline mr-2 text-muted-foreground" ariaHidden />
          <Span className="text-muted-foreground">
            {t('generator.preview.temporaryRedirectInfo')}
          </Span>
        </Div>
      )}
    </Div>
  )
}
