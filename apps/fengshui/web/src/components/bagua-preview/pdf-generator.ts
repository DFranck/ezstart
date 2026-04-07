import { logger } from '@ezstart/logger'
import { PdfDocument } from '@ezstart/pdf-sdk'
import { toast } from 'sonner'

import type { YearBaguaConfig } from '@/types/yearBaguaConfig'

interface PdfGeneratorOptions {
  wheelRef: React.RefObject<HTMLDivElement | null>
  gridRef: React.RefObject<HTMLDivElement | null>
  cardsGridRef: React.RefObject<HTMLDivElement | null>
  config: YearBaguaConfig
  bearingFromNorth: number
  onPdfUrl: (url: string) => void
  onResult: (result: { previews: string[]; pageCount: number }) => void
  onGeneratingChange: (isGenerating: boolean) => void
}

function makeVisible(el: HTMLElement) {
  el.style.position = 'fixed'
  el.style.left = '0px'
  el.style.top = '0px'
  el.style.visibility = 'visible'
  el.style.pointerEvents = 'none'
  el.style.zIndex = '-1'
}

function makeHidden(el: HTMLElement) {
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  el.style.top = '0'
  el.style.visibility = ''
  el.style.pointerEvents = 'none'
  el.style.zIndex = '-1'
}

export async function generatePDF({
  wheelRef,
  gridRef,
  cardsGridRef,
  config,
  bearingFromNorth,
  onPdfUrl,
  onResult,
  onGeneratingChange,
}: PdfGeneratorOptions) {
  try {
    onGeneratingChange(true)
    logger.debug('Starting PDF generation...')

    // Wait for elements to render
    await new Promise(resolve => setTimeout(resolve, 2000))

    if (!wheelRef.current || !gridRef.current) {
      throw new Error('Wheel or Grid element not found')
    }

    const year = config.year || new Date().getFullYear()
    const captureOpts = {
      engine: 'dom-to-image' as const,
      scale: 2,
      bgcolor: '#ffffff',
      prepare: makeVisible,
      cleanup: makeHidden,
    }

    const doc = new PdfDocument({ format: 'a4' })

    // Page 1: Cover
    doc
      .textPage()
      .space(80)
      .title('Analyse Feng Shui Bagua', { fontSize: 28, color: '#1a1a2e' })
      .space(10)
      .subtitle(`Année ${year}`, { fontSize: 18, color: '#4a4a6a' })
      .space(8)
      .text(`Orientation : ${Math.round(bearingFromNorth)}°`, {
        fontSize: 14,
        color: '#666666',
        align: 'center',
      })
      .space(5)
      .text(
        new Date().toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        { fontSize: 12, color: '#888888', align: 'center' }
      )
      .space(30)
      .separator()
      .space(40)
      .text('Rapport généré par EZStart FengShui', {
        fontSize: 10,
        color: '#aaaaaa',
        align: 'center',
      })

    // Page 2: Wheel
    doc
      .capturePage(wheelRef.current, {
        ...captureOpts,
        width: 600,
        height: 600,
      })
      .subtitle('Boussole Bagua')

    // Page 3: Grid
    doc
      .capturePage(gridRef.current, {
        ...captureOpts,
        width: 600,
        height: 600,
      })
      .subtitle('Grille Bagua')

    // Pages 4+: Orientations (auto-paginated)
    if (cardsGridRef.current) {
      doc.capturePages(cardsGridRef.current, captureOpts).title('Orientations Feng Shui')
    }

    const result = await doc.build()

    logger.debug(`PDF generated: ${result.pageCount} pages`)
    onPdfUrl(result.blobUrl)
    onResult({ previews: result.previews, pageCount: result.pageCount })
  } catch (error) {
    logger.error('PDF generation error:', error)
    const msg = error instanceof Error ? error.message : 'Unknown error'
    toast.error(`Erreur PDF: ${msg}`)
  } finally {
    onGeneratingChange(false)
  }
}

export function handleDownloadPDF(pdfUrl: string | null, year?: number) {
  if (!pdfUrl) return
  try {
    const link = document.createElement('a')
    link.href = pdfUrl
    link.download = `analyse-bagua-${year || new Date().getFullYear()}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    logger.error('Download error:', error)
    toast.error('Erreur téléchargement PDF')
  }
}
