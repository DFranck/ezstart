'use client'

import { Div, H3, Icon, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'

interface PdfPreviewProps {
  isGenerating: boolean
  isMobile: boolean
  pdfUrl: string | null
  previews: string[]
  pageCount: number
}

export function PdfPreview({
  isGenerating,
  isMobile,
  pdfUrl,
  previews,
  pageCount,
}: PdfPreviewProps) {
  const t = useTranslations()

  return (
    <Div className="flex flex-col items-center gap-4 px-2 sm:px-0">
      {isGenerating && (
        <Div
          className="w-full border border-border rounded-lg p-6 bg-gradient-to-br from-primary/5 to-primary/10 text-center flex items-center justify-center"
          style={{ minHeight: '300px' }}
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

      {pdfUrl && !isGenerating && (
        <Div className="w-full">
          {isMobile ? (
            <Div className="border border-border rounded-lg p-6 bg-muted text-center">
              <Icon name="lucide:FileCheck" className="w-12 h-12 mx-auto mb-3 text-success" />
              <H3 className="font-semibold text-foreground mb-2">PDF prêt !</H3>
              <P className="text-sm text-muted-foreground">{pageCount} pages</P>
            </Div>
          ) : (
            <Div className="border border-border rounded-lg p-4 bg-background shadow-inner">
              <Div className="flex flex-wrap gap-4 justify-center">
                {/* Cover page (text preview) */}
                <Div className="flex flex-col items-center gap-2">
                  <Span className="text-xs text-muted-foreground font-medium">
                    {t('pdfModal.cover')}
                  </Span>
                  <Div className="w-[140px] aspect-[210/297] bg-white rounded-lg shadow border flex flex-col items-center justify-center p-3 gap-1">
                    <Span className="text-[10px] font-bold text-gray-800 text-center">
                      Analyse Feng Shui Bagua
                    </Span>
                    <Span className="text-[8px] text-gray-400">Rapport complet</Span>
                  </Div>
                </Div>

                {/* Capture previews */}
                {previews.map((preview, idx) => (
                  <Div key={idx} className="flex flex-col items-center gap-2">
                    <Span className="text-xs text-muted-foreground font-medium">
                      {idx === 0
                        ? t('pdfModal.compass')
                        : idx === 1
                          ? t('pdfModal.grid')
                          : 'Orientations'}
                    </Span>
                    <Div className="w-[140px] aspect-[210/297] bg-white rounded-lg shadow border overflow-hidden flex items-start justify-center p-1">
                      <img
                        src={preview}
                        alt={`Page ${idx + 2}`}
                        className="w-full h-auto object-contain object-top"
                      />
                    </Div>
                  </Div>
                ))}
              </Div>

              {pageCount > 0 && (
                <P className="text-center text-xs text-muted-foreground mt-3">
                  {pageCount} pages au total
                </P>
              )}
            </Div>
          )}
        </Div>
      )}
    </Div>
  )
}
