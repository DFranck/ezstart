import { logger } from '@ezstart/logger'
import { toast } from 'sonner'

interface PdfGeneratorOptions {
  wheelRef: React.RefObject<HTMLDivElement | null>
  gridRef: React.RefObject<HTMLDivElement | null>
  cardsRef: React.RefObject<HTMLDivElement | null>
  cardsGridRef: React.RefObject<HTMLDivElement | null>
  pdfBgColor: string
  titleText: string
  onPdfUrl: (url: string) => void
  onPreviewImages: (images: { page1?: string; page2?: string }) => void
  onGeneratingChange: (isGenerating: boolean) => void
}

export async function generatePDF({
  wheelRef,
  gridRef,
  cardsRef,
  cardsGridRef,
  pdfBgColor,
  titleText,
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
      /* Hide all scrollbars during PDF generation */
      * {
        scrollbar-width: none !important; /* Firefox */
        -ms-overflow-style: none !important; /* IE and Edge */
      }
      *::-webkit-scrollbar {
        display: none !important; /* Chrome, Safari, Opera */
        width: 0 !important;
        height: 0 !important;
      }
      *::-webkit-scrollbar-track {
        display: none !important;
      }
      *::-webkit-scrollbar-thumb {
        display: none !important;
      }
      body, html {
        overflow: hidden !important;
      }
    `
    document.head.appendChild(hideScrollbarStyle)

    logger.debug('Starting PDF generation with iframe-safe approach...')

    // Wait for elements to render - increased delay for SVG
    await new Promise(resolve => setTimeout(resolve, 3000))

    if (!wheelRef.current || !gridRef.current) {
      logger.error('Wheel or Grid element not found after delay')
      throw new Error('Wheel or Grid element not found - make sure the modal is open')
    }

    logger.debug('Wheel and Grid elements found')

    // Import libraries dynamically
    const domtoimage = (await import('dom-to-image')).default
    const jsPDF = (await import('jspdf')).default

    logger.debug('Libraries imported, trying dom-to-image capture...')

    // dom-to-image.toPng with high resolution for optimal PDF quality
    const containerSize = 600
    const captureSize = 1200
    const scaleFactor = captureSize / containerSize

    // Capture wheel component
    logger.debug('Capturing wheel component...')
    if (!wheelRef.current) throw new Error('Wheel container not found')

    const originalWheelStyle = {
      position: wheelRef.current.style.position || 'absolute',
      top: wheelRef.current.style.top || '-9999px',
      left: wheelRef.current.style.left || '-9999px',
      display: wheelRef.current.style.display || 'block',
    }

    wheelRef.current.style.position = 'static'
    wheelRef.current.style.top = 'auto'
    wheelRef.current.style.left = 'auto'
    wheelRef.current.style.display = 'block'

    await new Promise(resolve => setTimeout(resolve, 500))

    const wheelDataUrl = await domtoimage.toPng(wheelRef.current, {
      quality: 1,
      width: captureSize,
      height: captureSize,
      bgcolor: pdfBgColor,
      style: {
        transform: `scale(${scaleFactor})`,
        transformOrigin: 'top left',
        width: `${containerSize}px`,
        height: `${containerSize}px`,
      },
      filter: (node: Node) => {
        const element = node as Element
        if (
          element.tagName === 'IFRAME' ||
          element.tagName === 'EMBED' ||
          element.tagName === 'OBJECT'
        ) {
          return false
        }
        return true
      },
    })

    // Restore original styling
    wheelRef.current.style.position = originalWheelStyle.position
    wheelRef.current.style.top = originalWheelStyle.top
    wheelRef.current.style.left = originalWheelStyle.left
    wheelRef.current.style.display = originalWheelStyle.display

    logger.debug('dom-to-image capture successful, data URL length:', wheelDataUrl.length)

    // Create canvas from wheelDataURL for jsPDF
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    await new Promise(resolve => {
      img.onload = () => {
        canvas.width = captureSize
        canvas.height = captureSize
        ctx?.drawImage(img, 0, 0, captureSize, captureSize)
        resolve(undefined)
      }
      img.src = wheelDataUrl
    })

    logger.debug(`Canvas created successfully: ${canvas.width}x${canvas.height}`)

    // Create PDF with 2 pages
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Function to create a PDF page with title and image
    const createPdfPage = async (
      pageNumber: number,
      _pageTitle: string,
      imageData: string,
      imgWidth: number = 190,
      imgHeight: number = 190
    ) => {
      if (pageNumber > 1) pdf.addPage()

      pdf.setFontSize(16)
      pdf.text(titleText, 105, 15, { align: 'center' })

      const x = (210 - imgWidth) / 2
      const y = 25

      pdf.addImage(imageData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST')

      pdf.setFontSize(8)
      pdf.text(`${pageNumber}/2`, 105, 290, { align: 'center' })

      return { x, y, imgWidth, imgHeight }
    }

    // Capture cards for wheel mode
    logger.debug('Capturing cards for wheel mode...')

    if (!cardsRef.current) {
      logger.error('Cards container not found')
      throw new Error('Cards container not found')
    }

    const originalCardsDisplay = cardsRef.current.style.display
    cardsRef.current.style.display = 'block'

    const cardsDataUrl = await domtoimage.toPng(cardsRef.current, {
      quality: 1,
      bgcolor: 'transparent',
      width: 800 * 2,
      height: 800 * 2,
      style: {
        transform: 'scale(2)',
        transformOrigin: 'top left',
        width: '800px',
        height: '800px',
      },
    })

    cardsRef.current.style.display = originalCardsDisplay

    // Create combined image with cards (for wheel)
    const createWheelImage = async () => {
      const combinedCanvas = document.createElement('canvas')
      const combinedCtx = combinedCanvas.getContext('2d')
      combinedCanvas.width = captureSize
      combinedCanvas.height = captureSize

      const baguaImg = new Image()
      const cardsImg = new Image()

      await new Promise(resolve => {
        let loaded = 0
        const onLoad = () => {
          loaded++
          if (loaded === 2) resolve(undefined)
        }

        baguaImg.onload = onLoad
        cardsImg.onload = onLoad
        baguaImg.src = wheelDataUrl
        cardsImg.src = cardsDataUrl
      })

      combinedCtx?.drawImage(baguaImg, 0, 0, captureSize, captureSize)
      combinedCtx?.drawImage(cardsImg, 0, 0, captureSize, captureSize)

      return combinedCanvas.toDataURL('image/png', 1.0)
    }

    const wheelImageData = await createWheelImage()

    // Capture Grid separately
    logger.debug('Capturing grid for page 2...')
    if (!gridRef.current) throw new Error('Grid container not found')

    const originalGridStyle = {
      position: gridRef.current.style.position || 'absolute',
      top: gridRef.current.style.top || '-9999px',
      left: gridRef.current.style.left || '-9999px',
      display: gridRef.current.style.display || 'block',
    }

    gridRef.current.style.position = 'static'
    gridRef.current.style.top = 'auto'
    gridRef.current.style.left = 'auto'
    gridRef.current.style.display = 'block'

    await new Promise(resolve => setTimeout(resolve, 500))

    const gridDataUrl = await domtoimage.toPng(gridRef.current, {
      quality: 1,
      width: captureSize,
      height: captureSize,
      bgcolor: pdfBgColor,
      style: {
        transform: `scale(${scaleFactor})`,
        transformOrigin: 'top left',
        width: `${containerSize}px`,
        height: `${containerSize}px`,
      },
    })

    gridRef.current.style.position = originalGridStyle.position
    gridRef.current.style.top = originalGridStyle.top
    gridRef.current.style.left = originalGridStyle.left
    gridRef.current.style.display = originalGridStyle.display

    const gridImageData = gridDataUrl

    // Capture page 3 from the REAL React cards in cardsGridRef
    logger.debug('Capturing page 3 from real React cards grid...')
    if (!cardsGridRef.current) throw new Error('Cards grid container not found')

    const originalCardsGridStyle = {
      position: cardsGridRef.current.style.position || 'absolute',
      top: cardsGridRef.current.style.top || '-9999px',
      left: cardsGridRef.current.style.left || '-9999px',
      display: cardsGridRef.current.style.display || 'block',
    }

    cardsGridRef.current.style.position = 'static'
    cardsGridRef.current.style.top = 'auto'
    cardsGridRef.current.style.left = 'auto'
    cardsGridRef.current.style.display = 'block'

    await new Promise(resolve => setTimeout(resolve, 100))

    const page3DataUrl = await domtoimage.toPng(cardsGridRef.current, {
      quality: 1,
      width: 1600,
      height: 2000,
      bgcolor: '#ffffff',
      style: {
        transform: 'scale(2)',
        transformOrigin: 'top left',
      },
    })

    cardsGridRef.current.style.position = originalCardsGridStyle.position
    cardsGridRef.current.style.top = originalCardsGridStyle.top
    cardsGridRef.current.style.left = originalCardsGridStyle.left
    cardsGridRef.current.style.display = originalCardsGridStyle.display

    const page3ImageData = page3DataUrl

    // Calculate PDF dimensions
    const gridY = 25
    const gridImgWidth = 90
    const gridImgHeight = gridImgWidth
    const cardsImgWidth = 170
    const cardsImgHeight = 180

    const gridX = (210 - gridImgWidth) / 2
    const cardsX = (210 - cardsImgWidth) / 2
    const cardsY = gridY + gridImgHeight

    // Create actual PDF page previews with titles and layout
    const createPdfPagePreview = async (pageNumber: number) => {
      const previewCanvas = document.createElement('canvas')
      const previewCtx = previewCanvas.getContext('2d')
      const mmToPx = 3.78
      previewCanvas.width = 210 * mmToPx
      previewCanvas.height = 297 * mmToPx

      if (!previewCtx) throw new Error('Canvas context not available')

      previewCtx.fillStyle = '#ffffff'
      previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height)

      previewCtx.fillStyle = '#000000'
      previewCtx.font = `16px Arial`
      previewCtx.textAlign = 'center'
      previewCtx.fillText(titleText, previewCanvas.width / 2, 15 * mmToPx)

      if (pageNumber === 1) {
        const previewImg = new Image()
        await new Promise(resolve => {
          previewImg.onload = () => {
            const imgSize = 190 * mmToPx
            const x = (previewCanvas.width - imgSize) / 2
            const y = 25 * mmToPx
            previewCtx.drawImage(previewImg, x, y, imgSize, imgSize)
            resolve(undefined)
          }
          previewImg.src = wheelImageData
        })
      } else {
        const gridImg = new Image()
        const cardsImg = new Image()

        await Promise.all([
          new Promise(resolve => {
            gridImg.onload = resolve
            gridImg.src = gridImageData
          }),
          new Promise(resolve => {
            cardsImg.onload = resolve
            cardsImg.src = page3ImageData
          }),
        ])

        const gridW = gridImgWidth * mmToPx
        const gridH = gridImgHeight * mmToPx
        const gridXPx = gridX * mmToPx
        const gridYPx = gridY * mmToPx
        previewCtx.drawImage(gridImg, gridXPx, gridYPx, gridW, gridH)

        const cardsW = cardsImgWidth * mmToPx
        const cardsH = cardsImgHeight * mmToPx
        const cardsXPx = cardsX * mmToPx
        const cardsYPx = cardsY * mmToPx
        previewCtx.drawImage(cardsImg, cardsXPx, cardsYPx, cardsW, cardsH)
      }

      previewCtx.fillStyle = '#000000'
      previewCtx.font = `8px Arial`
      previewCtx.textAlign = 'center'
      previewCtx.fillText(`${pageNumber}/2`, previewCanvas.width / 2, 290 * mmToPx)

      return previewCanvas.toDataURL('image/png', 1.0)
    }

    const page1Preview = await createPdfPagePreview(1)
    const page2Preview = await createPdfPagePreview(2)

    onPreviewImages({
      page1: page1Preview,
      page2: page2Preview,
    })

    // Generate Page 1 - Wheel with cards
    await createPdfPage(1, 'Page 1/2 - Vue Roue Bagua', wheelImageData)

    // Generate Page 2 - Combined Grid + Secteurs detailles
    pdf.addPage()

    pdf.setFontSize(16)
    pdf.text(titleText, 105, 15, { align: 'center' })

    pdf.addImage(gridImageData, 'PNG', gridX, gridY, gridImgWidth, gridImgHeight, undefined, 'FAST')
    pdf.addImage(
      page3ImageData,
      'PNG',
      cardsX,
      cardsY,
      cardsImgWidth,
      cardsImgHeight,
      undefined,
      'FAST'
    )

    pdf.setFontSize(8)
    pdf.text('2/2', 105, 290, { align: 'center' })

    // Generate blob and URL
    const blob = pdf.output('blob')
    const url = URL.createObjectURL(blob)
    logger.debug('PDF generated successfully with 2 pages: Wheel + Combined Grid/Cards views')
    onPdfUrl(url)
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
