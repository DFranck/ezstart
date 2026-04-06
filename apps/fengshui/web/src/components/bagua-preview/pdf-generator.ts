import { logger } from '@ezstart/logger'
import { PdfBuilder, captureElement } from '@ezstart/pdf-sdk'
import { toast } from 'sonner'

import type { YearBaguaConfig } from '@/types/yearBaguaConfig'

interface PdfGeneratorOptions {
  wheelRef: React.RefObject<HTMLDivElement | null>
  gridRef: React.RefObject<HTMLDivElement | null>
  cardsRef: React.RefObject<HTMLDivElement | null>
  cardsGridRef: React.RefObject<HTMLDivElement | null>
  pdfBgColor: string
  titleText: string
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
  onPdfUrl: (url: string) => void
  onPreviewImages: (images: { page1?: string; page2?: string }) => void
  onGeneratingChange: (isGenerating: boolean) => void
}

/**
 * Temporarily make a hidden element visible for capture, run an async callback,
 * then restore original styles.
 */
async function withVisible<T>(
  element: HTMLElement,
  fn: () => Promise<T>
): Promise<T> {
  const original = {
    position: element.style.position,
    top: element.style.top,
    left: element.style.left,
    display: element.style.display,
  }

  element.style.position = 'static'
  element.style.top = 'auto'
  element.style.left = 'auto'
  element.style.display = 'block'

  await new Promise(resolve => setTimeout(resolve, 500))

  try {
    return await fn()
  } finally {
    element.style.position = original.position
    element.style.top = original.top
    element.style.left = original.left
    element.style.display = original.display
  }
}

export async function generatePDF({
  wheelRef,
  gridRef,
  cardsRef,
  cardsGridRef,
  pdfBgColor,
  onPdfUrl,
  onPreviewImages,
  onGeneratingChange,
}: PdfGeneratorOptions) {
  try {
    onGeneratingChange(true)

    // Inject global CSS to hide ALL scrollbars during generation
    const hideScrollbarStyle = document.createElement('style')
    hideScrollbarStyle.id = 'hide-scrollbars-during-pdf'
    hideScrollbarStyle.textContent = `
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
      body, html {
        overflow: hidden !important;
      }
    `
    document.head.appendChild(hideScrollbarStyle)

    logger.debug('Starting PDF generation (2-page report)...')

    // Wait for elements to render
    await new Promise(resolve => setTimeout(resolve, 3000))

    if (!wheelRef.current || !gridRef.current) {
      throw new Error('Wheel or Grid element not found - make sure the modal is open')
    }

    // ──────────────────────────────────────────────
    // Capture DOM elements
    // ──────────────────────────────────────────────

    const containerSize = 600

    // Capture wheel
    logger.debug('Capturing wheel component...')
    const wheelDataUrl = await withVisible(wheelRef.current, () =>
      captureElement(wheelRef.current!, {
        width: containerSize,
        height: containerSize,
        bgcolor: pdfBgColor,
        scale: 2,
      })
    )

    // Capture cards overlay for the wheel composite
    let wheelCompositeUrl = wheelDataUrl
    if (cardsRef.current) {
      const originalCardsDisplay = cardsRef.current.style.display
      cardsRef.current.style.display = 'block'

      const cardsDataUrl = await captureElement(cardsRef.current, {
        width: 800,
        height: 800,
        bgcolor: 'transparent',
        scale: 2,
      })

      cardsRef.current.style.display = originalCardsDisplay

      // Combine wheel + cards
      const captureSize = 1200
      const combinedCanvas = document.createElement('canvas')
      const combinedCtx = combinedCanvas.getContext('2d')
      combinedCanvas.width = captureSize
      combinedCanvas.height = captureSize

      const baguaImg = new Image()
      const cardsImg = new Image()

      await new Promise<void>(resolve => {
        let loaded = 0
        const onLoad = () => {
          loaded++
          if (loaded === 2) resolve()
        }
        baguaImg.onload = onLoad
        cardsImg.onload = onLoad
        baguaImg.src = wheelDataUrl
        cardsImg.src = cardsDataUrl
      })

      combinedCtx?.drawImage(baguaImg, 0, 0, captureSize, captureSize)
      combinedCtx?.drawImage(cardsImg, 0, 0, captureSize, captureSize)
      wheelCompositeUrl = combinedCanvas.toDataURL('image/png', 1.0)
    }

    // Capture grid
    logger.debug('Capturing grid component...')
    const gridDataUrl = await withVisible(gridRef.current, () =>
      captureElement(gridRef.current!, {
        width: containerSize,
        height: containerSize,
        bgcolor: pdfBgColor,
        scale: 2,
      })
    )

    // Capture cards grid (detailed sector grid)
    let cardsGridDataUrl: string | null = null
    if (cardsGridRef?.current) {
      logger.debug('Capturing cards grid component...')
      cardsGridDataUrl = await withVisible(cardsGridRef.current, () =>
        captureElement(cardsGridRef.current!, {
          bgcolor: pdfBgColor,
          scale: 2,
        })
      )
    }

    // ──────────────────────────────────────────────
    // Build 2-page PDF
    // ──────────────────────────────────────────────

    const builder = new PdfBuilder({ format: 'a4', orientation: 'portrait' })

    // Page 1: Wheel composite (full page image)
    builder
      .addPage()
      .addImage(wheelCompositeUrl, { width: 190, height: 190, align: 'center' })

    // Page 2: Grid + Cards grid
    builder.addPage()

    if (gridDataUrl) {
      builder.addImage(gridDataUrl, { width: 90, height: 90, align: 'center' })
      builder.addSpace(5)
    }

    if (cardsGridDataUrl) {
      builder.addImage(cardsGridDataUrl, { width: 170, height: 180, align: 'center' })
    }

    builder.addPageNumbers()

    const { blobUrl } = await builder.build()

    logger.debug('PDF generated successfully with 2 pages')
    onPdfUrl(blobUrl)

    // Provide preview images (wheel and grid captures)
    onPreviewImages({
      page1: wheelCompositeUrl,
      page2: gridDataUrl,
    })
  } catch (error) {
    logger.error('Erreur generation PDF detaillee:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    toast.error(`Erreur lors de la generation du PDF: ${errorMessage}`)
  } finally {
    const injectedStyle = document.getElementById('hide-scrollbars-during-pdf')
    if (injectedStyle) {
      document.head.removeChild(injectedStyle)
    }
    document.body.style.overflow = ''
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
    logger.error('Erreur telechargement PDF:', error)
    toast.error('Erreur lors du telechargement du PDF')
  }
}
