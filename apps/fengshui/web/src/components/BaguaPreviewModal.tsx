'use client'

import { DIRECTIONS, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Button, Icon, Modal } from '@ezstart/ui/components'
import { useEffect, useRef, useState } from 'react'
import BaguaWheel from './steps/BaguaWheel'
import BaguaGrid from './steps/BaguaGrid'
import { Transformations } from '@/types/bagua'

type Props = {
  isOpen: boolean
  onClose: () => void
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
  visualizationMode?: 'wheel' | 'grid'
  transformations?: Transformations
}

export function BaguaPreviewModal({ isOpen, onClose, config, planImage, bearingFromNorth, visualizationMode = 'wheel', transformations }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [previewImageUrls, setPreviewImageUrls] = useState<{
    page1?: string
    page2?: string
    page3?: string
  }>({})
  const [isDarkMode, setIsDarkMode] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  // Variables de couleurs pour le PDF basées sur le theme
  const pdfBgColor = isDarkMode ? '#1a1a1a' : '#ffffff'
  const pdfTextColor = isDarkMode ? '#ffffff' : '#000000'
  const pdfCardBg = isDarkMode ? '#2a2a2a' : '#ffffff'
  const pdfBorderColor = isDarkMode ? '#4a4a4a' : '#e5e5e5'

  // Détection mobile et theme
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      )
    }
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }
    checkMobile()
    checkTheme()
    window.addEventListener('resize', checkMobile)

    // Observer pour changements de theme
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => {
      window.removeEventListener('resize', checkMobile)
      observer.disconnect()
    }
  }, [])

  const generatePDF = async () => {
    try {
      setIsGenerating(true)
      console.log('Starting PDF generation with iframe-safe approach...')

      // Attendre que les éléments soient rendus
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (!wheelRef.current || !gridRef.current) {
        console.error('Wheel or Grid element not found after delay')
        throw new Error('Wheel or Grid element not found - make sure the modal is open')
      }

      console.log('Wheel and Grid elements found:', wheelRef.current, gridRef.current)

      // Import libraries dynamically
      const domtoimage = (await import('dom-to-image')).default
      const jsPDF = (await import('jspdf')).default

      console.log('Libraries imported, trying dom-to-image capture...')

      // Utiliser dom-to-image qui est plus fiable pour les SVG
      console.log('Capturing element with dom-to-image...')

      // dom-to-image.toPng avec haute résolution pour qualité PDF optimale
      // Capture à 1200px (2x) puis scale down pour meilleure qualité
      const containerSize = 600 // BaguaWheel size original
      const captureSize = 1200 // Capture à 2x la résolution
      const scaleFactor = captureSize / containerSize

      // First capture the wheel component
      console.log('Capturing wheel component...')
      if (!wheelRef.current) throw new Error('Wheel container not found')

      // Temporarily make the wheel container visible for capture
      const originalWheelStyle = {
        position: wheelRef.current.style.position,
        top: wheelRef.current.style.top,
        left: wheelRef.current.style.left,
        display: wheelRef.current.style.display
      }

      wheelRef.current.style.position = 'static'
      wheelRef.current.style.top = 'auto'
      wheelRef.current.style.left = 'auto'
      wheelRef.current.style.display = 'block'

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100))

      const wheelDataUrl = await domtoimage.toPng(wheelRef.current, {
        quality: 1,
        width: captureSize,
        height: captureSize,
        bgcolor: pdfBgColor, // Fond adapté au theme
        style: {
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'top left',
          width: `${containerSize}px`,
          height: `${containerSize}px`,
        },
        filter: node => {
          // Filtrer les éléments problématiques
          const element = node as Element
          if (
            element.tagName === 'IFRAME' ||
            element.tagName === 'EMBED' ||
            element.tagName === 'OBJECT'
          ) {
            return false
          }

          // Garder tous les autres éléments
          return true
        },
      })

      // Restore original styling
      wheelRef.current.style.position = originalWheelStyle.position
      wheelRef.current.style.top = originalWheelStyle.top
      wheelRef.current.style.left = originalWheelStyle.left
      wheelRef.current.style.display = originalWheelStyle.display

      console.log('dom-to-image capture successful, data URL length:', wheelDataUrl.length)

      // Créer un canvas à partir du wheelDataURL pour jsPDF
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      await new Promise(resolve => {
        img.onload = () => {
          // Canvas à haute résolution pour PDF de qualité
          canvas.width = captureSize
          canvas.height = captureSize
          // Dessiner l'image à sa résolution native (haute qualité)
          ctx?.drawImage(img, 0, 0, captureSize, captureSize)
          resolve(undefined)
        }
        img.src = wheelDataUrl
      })

      console.log('Canvas created successfully:', canvas.width, 'x', canvas.height)

      // Create PDF with 2 pages
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })


      // Function to create cards grid page (3x3 layout)
      const createCardsGridPage = async (pageNumber: number) => {
        if (pageNumber > 1) pdf.addPage()

        // Add page title
        pdf.setFontSize(20)
        pdf.text('Analyse Feng Shui Bagua', 105, 20, { align: 'center' })

        pdf.setFontSize(14)
        pdf.text(
          `Page ${pageNumber}/3 - Secteurs Détaillés`,
          105,
          35,
          { align: 'center' }
        )

        pdf.setFontSize(12)
        pdf.text(
          `Configuration ${config.year || '2025'} - Orientation ${Math.round(bearingFromNorth)}°`,
          105,
          45,
          { align: 'center' }
        )

        // Grid layout: 3x3 cards
        const startY = 60
        const cardWidth = 60
        const cardHeight = 80
        const spacingX = 70
        const spacingY = 90
        const startX = (210 - (spacingX * 2)) / 2 // Center horizontally

        // Get all 9 directions (8 directions + center)
        const allDirections = DIRECTIONS_WITH_CENTER

        allDirections.forEach((dir, index) => {
          const sector = config.orientations?.[dir]
          if (!sector) return

          const row = Math.floor(index / 3)
          const col = index % 3
          const x = startX + (col * spacingX)
          const y = startY + (row * spacingY)

          const accent = sector.colorHex
          const accents = sector.colorHexes

          // Convert hex colors to RGB for jsPDF
          const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
            return result ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16)
            } : { r: 0, g: 0, b: 0 }
          }

          const accentRgb = hexToRgb(accent)

          // Card background
          pdf.setFillColor(isDarkMode ? 42 : 255, isDarkMode ? 42 : 255, isDarkMode ? 42 : 255)
          pdf.rect(x, y, cardWidth, cardHeight, 'F')

          // Card border
          pdf.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
          pdf.setLineWidth(0.5)
          pdf.rect(x, y, cardWidth, cardHeight, 'S')

          // Header with gradient effect (simulate with colored rectangle)
          pdf.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
          pdf.rect(x, y, cardWidth, 12, 'F')

          // Direction and number in header
          pdf.setTextColor(255, 255, 255)
          pdf.setFontSize(8)
          pdf.text(`${dir} • ${sector.element} • ${sector.number}`, x + cardWidth/2, y + 8, { align: 'center' })

          // Title
          pdf.setTextColor(isDarkMode ? 255 : 0, isDarkMode ? 255 : 0, isDarkMode ? 255 : 0)
          pdf.setFontSize(9)
          pdf.text(sector.title, x + cardWidth/2, y + 20, { align: 'center', maxWidth: cardWidth - 4 })

          // First tip or enhancer
          if (sector.tips?.[0] || sector.enhancers?.[0]) {
            pdf.setFontSize(7)
            pdf.setTextColor(100, 100, 100)
            const tip = (sector.tips?.[0] || sector.enhancers?.[0])?.substring(0, 60) + '...'
            pdf.text(tip, x + 2, y + 32, { maxWidth: cardWidth - 4 })
          }

          // Star info if available
          if (sector.star) {
            pdf.setFontSize(6)
            pdf.setTextColor(sector.star.status === 'bonne' ? 34 : 239, sector.star.status === 'bonne' ? 197 : 68, sector.star.status === 'bonne' ? 94 : 68)
            pdf.text(`★ ${sector.star.star} - ${sector.star.element}`, x + 2, y + 50)

            if (sector.star.remedies?.length > 0) {
              pdf.setTextColor(100, 100, 100)
              const remedies = sector.star.remedies.join(', ').substring(0, 40) + '...'
              pdf.text(`🛡️ ${remedies}`, x + 2, y + 58)
            }
          }
        })
      }

      // Function to create a page for a specific visualization mode
      const createPageForMode = async (mode: 'wheel' | 'grid', pageNumber: number, imageData: string) => {
        if (pageNumber > 1) pdf.addPage()

        // Add page title
        pdf.setFontSize(20)
        pdf.text('Analyse Feng Shui Bagua', 105, 20, { align: 'center' })

        pdf.setFontSize(14)
        pdf.text(
          `Page ${pageNumber}/2 - Vue ${mode === 'wheel' ? 'Roue' : 'Grille'} Bagua`,
          105,
          35,
          { align: 'center' }
        )

        pdf.setFontSize(12)
        pdf.text(
          `Configuration ${config.year || '2025'} - Orientation ${Math.round(bearingFromNorth)}°`,
          105,
          45,
          { align: 'center' }
        )

        const maxWidth = mode === 'wheel' ? 190 : 160
        const imgWidth = maxWidth
        const imgHeight = maxWidth
        const x = (210 - imgWidth) / 2
        const y = mode === 'wheel' ? 55 : 70

        // Add the image
        pdf.addImage(imageData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST')

        // Add orientation info
        pdf.setFontSize(12)
        pdf.text(
          `Orientation : ${Math.round(bearingFromNorth)}° depuis le Nord`,
          105,
          y + imgHeight + 15,
          { align: 'center' }
        )

        return { x, y, imgWidth, imgHeight }
      }

      // Capture cards for wheel mode
      console.log('Capturing cards for wheel mode...')

      if (!cardsRef.current) {
        console.error('Cards container not found')
        throw new Error('Cards container not found')
      }

      // Rendre le conteneur des cartes visible pour la capture
      const originalCardsDisplay = cardsRef.current.style.display
      cardsRef.current.style.display = 'block'

      // Capturer les cartes avec haute résolution
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

      // Remettre masqué
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

        // Draw bagua background
        combinedCtx?.drawImage(baguaImg, 0, 0, captureSize, captureSize)
        // Draw cards overlay (only for wheel)
        combinedCtx?.drawImage(cardsImg, 0, 0, captureSize, captureSize)

        return combinedCanvas.toDataURL('image/png', 1.0)
      }

      // Create wheel image (with cards)
      const wheelImageData = await createWheelImage()

      // Capture Grid separately
      console.log('Capturing grid for page 2...')
      if (!gridRef.current) throw new Error('Grid container not found')

      // Temporarily make the grid container visible for capture
      const originalGridStyle = {
        position: gridRef.current.style.position,
        top: gridRef.current.style.top,
        left: gridRef.current.style.left,
        display: gridRef.current.style.display
      }

      gridRef.current.style.position = 'static'
      gridRef.current.style.top = 'auto'
      gridRef.current.style.left = 'auto'
      gridRef.current.style.display = 'block'

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100))

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

      // Restore original styling
      gridRef.current.style.position = originalGridStyle.position
      gridRef.current.style.top = originalGridStyle.top
      gridRef.current.style.left = originalGridStyle.left
      gridRef.current.style.display = originalGridStyle.display

      // For grid, use the captured grid image (no cards)
      const gridImageData = gridDataUrl

      // Create preview for page 3 (cards grid)
      const page3Canvas = document.createElement('canvas')
      const page3Ctx = page3Canvas.getContext('2d')
      page3Canvas.width = 600
      page3Canvas.height = 800

      // White background
      page3Ctx!.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff'
      page3Ctx!.fillRect(0, 0, 600, 800)

      // Title
      page3Ctx!.fillStyle = isDarkMode ? '#ffffff' : '#000000'
      page3Ctx!.font = 'bold 20px Arial'
      page3Ctx!.textAlign = 'center'
      page3Ctx!.fillText('Secteurs Détaillés', 300, 40)

      // Draw cards grid preview
      const cardW = 180
      const cardH = 220
      const spacing = 20
      const startX = (600 - (cardW * 3 + spacing * 2)) / 2
      const startY = 80

      DIRECTIONS_WITH_CENTER.forEach((dir, index) => {
        const sector = config.orientations?.[dir]
        if (!sector) return

        const row = Math.floor(index / 3)
        const col = index % 3
        const x = startX + col * (cardW + spacing)
        const y = startY + row * (cardH + spacing)

        // Card background
        page3Ctx!.fillStyle = isDarkMode ? '#2a2a2a' : '#ffffff'
        page3Ctx!.fillRect(x, y, cardW, cardH)

        // Card border
        page3Ctx!.strokeStyle = sector.colorHex
        page3Ctx!.lineWidth = 2
        page3Ctx!.strokeRect(x, y, cardW, cardH)

        // Header
        page3Ctx!.fillStyle = sector.colorHex
        page3Ctx!.fillRect(x, y, cardW, 30)

        // Header text
        page3Ctx!.fillStyle = '#ffffff'
        page3Ctx!.font = 'bold 12px Arial'
        page3Ctx!.textAlign = 'center'
        page3Ctx!.fillText(`${dir} • ${sector.element} • ${sector.number}`, x + cardW/2, y + 20)

        // Title
        page3Ctx!.fillStyle = isDarkMode ? '#ffffff' : '#000000'
        page3Ctx!.font = 'bold 14px Arial'
        page3Ctx!.fillText(sector.title, x + cardW/2, y + 50)

        // Tip
        if (sector.tips?.[0] || sector.enhancers?.[0]) {
          page3Ctx!.fillStyle = '#666666'
          page3Ctx!.font = '10px Arial'
          const tip = (sector.tips?.[0] || sector.enhancers?.[0])?.substring(0, 80) + '...'
          // Split text into multiple lines
          const words = tip.split(' ')
          let line = ''
          let lineY = y + 75
          for (const word of words) {
            const testLine = line + word + ' '
            const metrics = page3Ctx!.measureText(testLine)
            if (metrics.width > cardW - 20 && line !== '') {
              page3Ctx!.fillText(line, x + cardW/2, lineY)
              line = word + ' '
              lineY += 15
            } else {
              line = testLine
            }
          }
          page3Ctx!.fillText(line, x + cardW/2, lineY)
        }
      })

      const page3ImageData = page3Canvas.toDataURL('image/png', 1.0)

      // Save preview images for all pages
      setPreviewImageUrls({
        page1: wheelImageData,
        page2: gridImageData,
        page3: page3ImageData
      })

      // Generate Page 1 (Wheel with cards)
      await createPageForMode('wheel', 1, wheelImageData)

      // Generate Page 2 (Grid without cards)
      await createPageForMode('grid', 2, gridImageData)

      // Generate Page 3 (Cards in 3x3 grid)
      await createCardsGridPage(3)

      // Generate blob and URL
      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      console.log('PDF generated successfully with 3 pages: Wheel + Grid + Cards Grid views')
      setPdfUrl(url)
    } catch (error) {
      console.error('Erreur génération PDF détaillée:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur lors de la génération du PDF: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!pdfUrl) return

    try {
      // Create download link
      const link = document.createElement('a')
      link.href = pdfUrl
      link.download = `analyse-bagua-${config.year || new Date().getFullYear()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error)
      alert('Erreur lors du téléchargement du PDF')
    }
  }

  // Generate PDF when modal opens
  useEffect(() => {
    if (isOpen && !pdfUrl) {
      generatePDF()
    }
  }, [isOpen, pdfUrl])

  // Cleanup URL when modal closes
  useEffect(() => {
    if (!isOpen && pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
      setPreviewImageUrls({}) // Nettoyer aussi les images de preview
    }
  }, [isOpen, pdfUrl])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          <Icon name="lucide:Compass" className="w-5 h-5 mr-2 text-foreground/60" />
          <span className="font-semibold">Analyse Feng Shui Bagua</span>
        </>
      }
      description={
        <span className="block">
          <span className="hidden sm:inline">Aperçu de votre roue Bagua • </span>
          {isGenerating ? 'Génération PDF...' : 'Cliquez "Générer PDF" pour créer le rapport'}
        </span>
      }
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2">
          <Button
            onClick={generatePDF}
            disabled={isGenerating}
            className="bg-blue-600 text-white hover:bg-blue-700 flex-1 sm:flex-initial"
          >
            <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
            {isGenerating ? 'Génération...' : 'Générer PDF'}
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={!pdfUrl || isGenerating}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white flex-1 sm:flex-initial"
          >
            <Icon name="lucide:Download" className="w-4 h-4 mr-2" />
            Télécharger PDF
          </Button>
        </div>
      }
      className="max-w-[800px] w-[95vw] max-h-[95vh] overflow-hidden"
    >
      {/* LOADER EN HAUT - Toujours visible pendant génération */}
      <div className="flex flex-col items-center gap-4 px-2 sm:px-0">

        {isGenerating && (
          <div className="w-full border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Icon name="lucide:FileText" className="w-12 h-12 text-blue-600 animate-pulse" />
                <div className="absolute -top-1 -right-1">
                  <Icon name="lucide:Loader2" className="w-6 h-6 text-blue-500 animate-spin" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Génération PDF en cours...</h3>
                <p className="text-sm text-gray-600 mb-1">
                  Capture haute résolution de votre analyse Feng Shui
                </p>
                <p className="text-xs text-gray-500">
                  3 pages: Roue + Grille + Secteurs détaillés
                </p>
              </div>
            </div>
          </div>
        )}

        {/* APERÇU PDF - Affiché quand terminé */}
        {pdfUrl && !isGenerating && (
          <div className="w-full">
            {isMobile ? (
              // Mobile: Message informatif
              <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 text-center">
                <Icon name="lucide:FileCheck" className="w-12 h-12 mx-auto mb-3 text-green-600" />
                <h3 className="font-semibold text-gray-900 mb-2">PDF généré avec succès !</h3>
                <p className="text-sm text-gray-600 mb-4">
                  L'aperçu n'est pas disponible sur mobile, mais votre PDF 3 pages est prêt.
                </p>
              </div>
            ) : (
              // Desktop: Preview des 3 pages
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-inner">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                  Aperçu de votre analyse Feng Shui (3 pages)
                </h4>
                {Object.keys(previewImageUrls).length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Page 1 - Wheel */}
                    {previewImageUrls.page1 && (
                      <div className="text-center">
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Page 1 - Vue Roue</h5>
                        <img
                          src={previewImageUrls.page1}
                          alt="Page 1 - Roue Bagua"
                          className="w-full h-auto rounded-lg shadow-md border"
                          style={{ maxHeight: '200px', objectFit: 'contain' }}
                        />
                      </div>
                    )}

                    {/* Page 2 - Grid */}
                    {previewImageUrls.page2 && (
                      <div className="text-center">
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Page 2 - Vue Grille</h5>
                        <img
                          src={previewImageUrls.page2}
                          alt="Page 2 - Grille Bagua"
                          className="w-full h-auto rounded-lg shadow-md border"
                          style={{ maxHeight: '200px', objectFit: 'contain' }}
                        />
                      </div>
                    )}

                    {/* Page 3 - Cards Grid */}
                    {previewImageUrls.page3 && (
                      <div className="text-center">
                        <h5 className="text-xs font-medium text-gray-600 mb-2">Page 3 - Secteurs</h5>
                        <img
                          src={previewImageUrls.page3}
                          alt="Page 3 - Secteurs Détaillés"
                          className="w-full h-auto rounded-lg shadow-md border"
                          style={{ maxHeight: '200px', objectFit: 'contain' }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-gray-500">
                    <Icon name="lucide:ImageIcon" className="w-12 h-12 mr-2" />
                    <span>Preview en cours de chargement...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Containers CACHÉS pour capture PDF */}
        {/* Wheel MASQUÉE pour capture PDF */}
        <div
          ref={wheelRef}
          style={{
            width: '600px',
            height: '600px',
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
          }}
          data-bagua="wheel-container"
        >
          {planImage && config && (
            <BaguaWheel
              src={planImage}
              bearingFromNorth={bearingFromNorth}
              size={600}
              config={config}
              radiusPct={46}
              insetRatio={1.0}
              labelOffset={12}
              cardsMode="none"
              cardsRadiusPct={60}
            />
          )}
        </div>

        {/* Grid MASQUÉE pour capture PDF */}
        <div
          ref={gridRef}
          style={{
            width: '600px',
            height: '600px',
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
          }}
          data-bagua="grid-container"
        >
          {planImage && config && (
            <div style={{ width: '600px', height: '600px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ maxWidth: '600px', maxHeight: '600px' }}>
                <BaguaGrid
                  src={planImage}
                  bearingFromNorth={bearingFromNorth}
                  size={600}
                  config={config}
                  cardsMode="none"
                  transformations={transformations}
                />
              </div>
            </div>
          )}
        </div>

        {/* Conteneur des BaguaSectorCard pour capture PDF */}
        <div
          ref={cardsRef}
          className="relative"
          style={{
            width: '800px',
            height: '800px',
            display: 'none',
          }}
        >
          {planImage &&
            config &&
            (visualizationMode === 'wheel' ? DIRECTIONS : DIRECTIONS_WITH_CENTER).map((dir, index) => {
              let xPct, yPct

              if (visualizationMode === 'wheel') {
                // Position en cercle pour la wheel
                const angle = index * 45
                const totalRotation = bearingFromNorth + (config?.rotationOffsetDeg ?? 0)
                const adjustedAngle = angle + totalRotation
                const radian = ((adjustedAngle - 90) * Math.PI) / 180

                const cardRadius = 320 // Distance du centre pour que les cartes encadrent bien le plan
                const centerX = 400
                const centerY = 400
                const cardX = centerX + cardRadius * Math.cos(radian)
                const cardY = centerY + cardRadius * Math.sin(radian)

                xPct = (cardX / 800) * 100
                yPct = (cardY / 800) * 100
              } else {
                // Position en grille EXTERNE pour la grid (en dehors du plan)
                const gridPositions = {
                  'NO': { x: 5, y: 5 },     // Coin Haut-Gauche EXTERNE
                  'N': { x: 50, y: 2 },     // Haut-Centre EXTERNE
                  'NE': { x: 95, y: 5 },    // Coin Haut-Droite EXTERNE
                  'O': { x: 2, y: 50 },     // Centre-Gauche EXTERNE
                  'C': { x: 50, y: 50 },    // Centre (reste au milieu)
                  'E': { x: 98, y: 50 },    // Centre-Droite EXTERNE
                  'SO': { x: 5, y: 95 },    // Coin Bas-Gauche EXTERNE
                  'S': { x: 50, y: 98 },    // Bas-Centre EXTERNE
                  'SE': { x: 95, y: 95 },   // Coin Bas-Droite EXTERNE
                }

                const position = gridPositions[dir as keyof typeof gridPositions]
                xPct = position ? position.x : 50
                yPct = position ? position.y : 50
              }

              // Version ultra-compacte pour PDF
              const sector = config.orientations?.[dir]
              if (!sector) return null

              const accent = sector.colorHex
              const accents = sector.colorHexes
              return (
                <div
                  key={`pdf-card-${dir}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 shadow-lg overflow-hidden"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    width: '120px',
                    borderColor: accent,
                    backgroundColor: pdfCardBg,
                  }}
                >
                  {/* Header compact avec couleur de fond */}
                  <div
                    className="h-6 flex items-center justify-center text-xs font-bold"
                    style={{
                      background:
                        accents && accents.length > 1
                          ? `linear-gradient(90deg, ${accents.join(', ')})`
                          : accent,
                      color: '#ffffff',
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {dir} • {sector.element} •{sector.number}
                  </div>

                  {/* Contenu compact */}
                  <div className="p-2 space-y-1">
                    {/* Titre */}
                    <div
                      className="text-xs font-semibold flex items-center justify-center gap-2 text-center"
                      style={{ color: pdfTextColor }}
                    >
                      {sector.title}
                    </div>

                    {/* Premier tip ou enhancer */}
                    {(sector.tips?.[0] || sector.enhancers?.[0]) && (
                      <div
                        className="text-[9px] leading-tight flex items-center"
                        style={{ color: isDarkMode ? '#a0a0a0' : '#6b7280' }}
                      >
                        {sector.shape && (
                          <Icon
                            name={
                              sector.shape === 'circle'
                                ? 'lucide:Circle'
                                : sector.shape === 'square'
                                  ? 'lucide:Square'
                                  : sector.shape === 'triangle'
                                    ? 'lucide:Triangle'
                                    : sector.shape === 'rectangle'
                                      ? 'lucide:RectangleHorizontal'
                                      : 'lucide:Waves'
                            }
                            className="w-3 h-3 mr-1"
                            style={{ color: accent }}
                          />
                        )}
                        {((sector.tips?.[0] || sector.enhancers?.[0])?.length || 0) > 35
                          ? (sector.tips?.[0] || sector.enhancers?.[0])?.substring(0, 32) + '...'
                          : sector.tips?.[0] || sector.enhancers?.[0]}
                      </div>
                    )}
                    {/* Etoile volante */}
                    {sector.star && (
                      <div
                        className="border-t pt-1"
                        style={{ borderColor: pdfBorderColor }}
                      >
                        <div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: isDarkMode ? '#a0a0a0' : '#6b7280' }}
                        >
                          <Icon
                            name="lucide:Star"
                            className="w-3 h-3 mr-1"
                            style={{
                              color: sector.star.status === 'bonne' ? '#22c55e' : '#ef4444',
                            }}
                          />
                          {sector.star.star} - {sector.star.element}
                        </div>
                        <div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: isDarkMode ? '#a0a0a0' : '#6b7280' }}
                        >
                          {sector.star.remedies?.length > 0 && (
                            <>
                              <Icon name="lucide:Shield" className="w-3 h-3 mr-1" />
                              {sector.star.remedies?.join(', ')}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>

      </div>
    </Modal>
  )
}
