'use client'

import { Link } from '@/i18n/navigation'
import { Button, Div, H3, Icon, P, Section, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { handleDownloadPDF } from './pdf-generator'

interface PdfPreviewViewProps {
  previews: string[]
  pageCount: number
  pdfUrl: string
  year?: number
  isGenerating?: boolean
  onBack: string | (() => void)
}

export function PdfPreviewView({
  previews,
  pageCount,
  pdfUrl,
  year,
  isGenerating = false,
  onBack,
}: PdfPreviewViewProps) {
  const t = useTranslations()

  const backButton = (
    <Button variant="ghost" size="sm" onClick={typeof onBack === 'function' ? onBack : undefined}>
      <Icon name="lucide:ArrowLeft" className="w-4 h-4 mr-2" />
      {t('pdfModal.backToAnalysis')}
    </Button>
  )

  return (
    <Section className="min-h-screen bg-muted/30">
      {/* Sticky top bar */}
      <Div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <Div className="container mx-auto max-w-4xl flex items-center justify-between">
          {typeof onBack === 'string' ? <Link href={onBack}>{backButton}</Link> : backButton}
          <Div className="flex items-center gap-3">
            {pageCount > 0 && (
              <Span className="text-sm text-muted-foreground">
                {t('pdfModal.pagesTotal', { count: pageCount })}
              </Span>
            )}
            <Button
              onClick={() => handleDownloadPDF(pdfUrl, year)}
              disabled={!pdfUrl || isGenerating}
              className="bg-primary text-primary-foreground"
              size="sm"
            >
              <Icon name="lucide:Download" className="w-4 h-4 mr-2" />
              {t('pdfModal.downloadPdf')}
            </Button>
          </Div>
        </Div>
      </Div>

      {/* Content */}
      <Div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* Loading state */}
        {isGenerating && (
          <Div
            className="w-full border border-border rounded-xl p-12 bg-gradient-to-br from-primary/5 to-primary/10 text-center flex items-center justify-center"
            style={{ minHeight: '400px' }}
          >
            <Div className="flex flex-col items-center gap-6">
              <Div className="flex items-center gap-4">
                <Icon name="lucide:FileText" className="w-12 h-12 text-primary" />
                <Icon name="lucide:Loader2" className="w-10 h-10 text-primary animate-spin" />
              </Div>
              <Div>
                <H3 className="font-semibold text-foreground mb-2">
                  {t('pdfModal.generatingInProgress')}
                </H3>
                <P className="text-sm text-muted-foreground">{t('pdfModal.capturingAnalysis')}</P>
              </Div>
            </Div>
          </Div>
        )}

        {/* Generated pages */}
        {!isGenerating && pdfUrl && (
          <>
            {/* Cover page (text-only, no image preview) */}
            <Div className="flex flex-col items-center gap-2">
              <Span className="text-sm text-muted-foreground font-medium">
                Page 1 — {t('pdfModal.cover')}
              </Span>
              <Div className="w-full max-w-[600px] aspect-[210/297] bg-white rounded-xl overflow-hidden flex flex-col items-center justify-center p-8 gap-3">
                <Span className="text-xl font-bold text-gray-800 text-center">
                  {t('pdfModal.title')}
                </Span>
              </Div>
            </Div>

            {/* Captured pages */}
            {previews.map((preview, idx) => {
              const pageNum = idx + 2
              let label: string
              if (idx === 0) label = t('pdfModal.compass')
              else if (idx === 1) label = t('pdfModal.grid')
              else label = t('pdfModal.orientations')

              return (
                <Div key={idx} className="flex flex-col items-center gap-2">
                  <Span className="text-sm text-muted-foreground font-medium">
                    Page {pageNum} — {label}
                  </Span>
                  <Div className="w-full max-w-[600px] bg-white rounded-xl overflow-hidden">
                    <img src={preview} alt={`Page ${pageNum}`} className="w-full h-auto" />
                  </Div>
                </Div>
              )
            })}
          </>
        )}
      </Div>

      {/* Bottom download bar */}
      {!isGenerating && pdfUrl && (
        <Div className="sticky bottom-0 z-20 bg-background/95 backdrop-blur border-t border-border px-4 py-3">
          <Div className="container mx-auto max-w-4xl flex items-center justify-center gap-4">
            <Button
              onClick={() => handleDownloadPDF(pdfUrl, year)}
              size="lg"
              className="bg-primary text-primary-foreground"
            >
              <Icon name="lucide:Download" className="w-5 h-5 mr-2" />
              {t('pdfModal.downloadPdf')} ({t('pdfModal.pagesTotal', { count: pageCount })})
            </Button>
          </Div>
        </Div>
      )}
    </Section>
  )
}
