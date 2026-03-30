'use client'

import { Div, H3, Icon, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface PdfPreviewProps {
  isGenerating: boolean
  isMobile: boolean
  pdfUrl: string | null
  previewImageUrls: { page1?: string; page2?: string }
}

export function PdfPreview({ isGenerating, isMobile, pdfUrl, previewImageUrls }: PdfPreviewProps) {
  const t = useTranslations()

  return (
    <Div className="flex flex-col items-center gap-4 px-2 sm:px-0">
      {isGenerating && (
        <Div
          className="w-full border border-border rounded-lg p-6 bg-gradient-to-br from-primary/5 to-primary/10 text-center flex items-center justify-center"
          style={{ minHeight: 'calc(-6rem + 70vh)', maxHeight: 'calc(-6rem + 70vh)' }}
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
              <P className="text-sm text-muted-foreground mb-1">
                {t('pdfModal.capturingAnalysis')}
              </P>
              <P className="text-xs text-muted-foreground">{t('pdfModal.twoPages')}</P>
            </Div>
          </Div>
        </Div>
      )}

      {pdfUrl && !isGenerating && (
        <Div className="w-full">
          {isMobile ? (
            <Div className="border border-border rounded-lg p-6 bg-muted text-center">
              <Icon name="lucide:FileCheck" className="w-12 h-12 mx-auto mb-3 text-success" />
              <H3 className="font-semibold text-foreground mb-2">PDF genere avec succes !</H3>
              <P className="text-sm text-muted-foreground mb-4">
                L&apos;apercu n&apos;est pas disponible sur mobile, mais votre PDF 2 pages est pret.
              </P>
            </Div>
          ) : (
            <Div className="border border-border rounded-lg p-4 bg-background shadow-inner">
              {Object.keys(previewImageUrls).length > 0 ? (
                <Div className="space-y-6">
                  {previewImageUrls.page1 && (
                    <img
                      src={previewImageUrls.page1}
                      alt="Page 1 - Roue Bagua"
                      className="w-full h-auto rounded-lg shadow-lg border mx-auto"
                      style={{ maxWidth: '400px' }}
                    />
                  )}

                  {previewImageUrls.page2 && (
                    <img
                      src={previewImageUrls.page2}
                      alt={`Page 2 - ${t('pdfModal.detailedSectors')}`}
                      className="w-full h-auto rounded-lg shadow-lg border mx-auto"
                      style={{ maxWidth: '400px' }}
                    />
                  )}
                </Div>
              ) : (
                <Div className="flex items-center justify-center h-64 text-muted-foreground">
                  <Icon name="lucide:ImageIcon" className="w-12 h-12 mr-2" />
                  <Span>Preview en cours de chargement...</Span>
                </Div>
              )}
            </Div>
          )}
        </Div>
      )}
    </Div>
  )
}
