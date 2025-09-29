'use client'

import { Transformations } from '@/types/bagua'
import { Direction, DIRECTIONS, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { calculateBaguaRotation } from '@/utils/baguaRotation'
import { Button, Icon, Modal } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import BaguaGrid from './steps/BaguaGrid'
import BaguaWheel from './steps/BaguaWheel'

// Mapping des directions vers les positions de la grille 3x3 (position de base, avant rotation)
// Organisation standard Feng Shui : N en haut, S en bas, E à droite, O à gauche
const GRID_POSITIONS_BASE: Record<Direction, { row: number; col: number }> = {
  NO: { row: 0, col: 0 }, // Haut-Gauche
  N: { row: 0, col: 1 }, // Haut-Centre
  NE: { row: 0, col: 2 }, // Haut-Droite
  O: { row: 1, col: 0 }, // Centre-Gauche
  C: { row: 1, col: 1 }, // Centre
  E: { row: 1, col: 2 }, // Centre-Droite
  SO: { row: 2, col: 0 }, // Bas-Gauche
  S: { row: 2, col: 1 }, // Bas-Centre
  SE: { row: 2, col: 2 }, // Bas-Droite
}

// Fonction pour obtenir la position dans la grille d'une direction selon le bearing
function getGridPositionForDirection(direction: Direction, rotation: number) {
  if (direction === 'C') {
    return GRID_POSITIONS_BASE['C'] // Le centre ne bouge jamais
  }

  // Si pas de rotation significative, retourner la position de base
  if (Math.abs(rotation) < 1) {
    return GRID_POSITIONS_BASE[direction]
  }

  // LOGIQUE SIMPLIFIEE comme BaguaWheel
  // rotation = bearing direct, on applique la même logique
  const rotationSteps = Math.round(rotation / 45) % 8

  // Index de base de la direction (N=0, NE=1, E=2, etc.)
  const baseIndex = DIRECTIONS.indexOf(direction as any)
  if (baseIndex === -1) return GRID_POSITIONS_BASE[direction]

  // MÊME LOGIQUE QUE WHEEL: rotation directe dans le même sens
  const rotatedIndex = (baseIndex + rotationSteps) % 8
  const rotatedDirection = DIRECTIONS[rotatedIndex]

  return GRID_POSITIONS_BASE[rotatedDirection as Direction]
}

type Props = {
  isOpen: boolean
  onClose: () => void
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
  visualizationMode?: 'wheel' | 'grid'
  transformations?: Transformations
}

export function BaguaPreviewModal({
  isOpen,
  onClose,
  config,
  planImage,
  bearingFromNorth,
  visualizationMode = 'wheel',
  transformations,
}: Props) {
  const t = useTranslations()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [previewImageUrls, setPreviewImageUrls] = useState<{
    page1?: string
    page2?: string
  }>({})
  const [isDarkMode, setIsDarkMode] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const cardsGridRef = useRef<HTMLDivElement>(null)

  // Calcul de la rotation avec la même fonction que BaguaWheel et BaguaGrid
  const rotation = calculateBaguaRotation(bearingFromNorth, config)

  // Variables de couleurs pour le PDF - TOUJOURS en mode clair
  const pdfBgColor = '#ffffff'
  const pdfTextColor = '#000000'
  const pdfCardBg = '#ffffff'
  const pdfBorderColor = '#e5e5e5'

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

      // Injecter CSS global pour masquer TOUTES les scrollbars pendant la génération
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
        position: wheelRef.current.style.position || 'absolute',
        top: wheelRef.current.style.top || '-9999px',
        left: wheelRef.current.style.left || '-9999px',
        display: wheelRef.current.style.display || 'block',
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

      // Function to create a PDF page with title and image
      const createPdfPage = async (
        pageNumber: number,
        pageTitle: string,
        imageData: string,
        imgWidth: number = 190,
        imgHeight: number = 190
      ) => {
        if (pageNumber > 1) pdf.addPage()

        // Titre compact en haut
        pdf.setFontSize(16)
        pdf.text(t('pdfModal.title'), 105, 15, { align: 'center' })

        // Image commence plus haut pour gagner de l'espace
        const x = (210 - imgWidth) / 2
        const y = 25

        // Add the image
        pdf.addImage(imageData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST')

        // Numéro de page en petit en bas
        pdf.setFontSize(8)
        pdf.text(`${pageNumber}/2`, 105, 290, { align: 'center' })

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
        position: gridRef.current.style.position || 'absolute',
        top: gridRef.current.style.top || '-9999px',
        left: gridRef.current.style.left || '-9999px',
        display: gridRef.current.style.display || 'block',
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

      // Capture page 3 from the REAL React cards in cardsGridRef
      console.log('Capturing page 3 from real React cards grid...')
      if (!cardsGridRef.current) throw new Error('Cards grid container not found')

      // Temporarily make the cards grid container visible for capture
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

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 100))

      const page3DataUrl = await domtoimage.toPng(cardsGridRef.current, {
        quality: 1,
        width: 1600, // Double résolution pour meilleure qualité
        height: 2000, // Double résolution
        bgcolor: '#ffffff', // Toujours blanc pour PDF
        style: {
          transform: 'scale(2)', // Scale 2x pour haute résolution
          transformOrigin: 'top left',
        },
      })

      // Restore original styling
      cardsGridRef.current.style.position = originalCardsGridStyle.position
      cardsGridRef.current.style.top = originalCardsGridStyle.top
      cardsGridRef.current.style.left = originalCardsGridStyle.left
      cardsGridRef.current.style.display = originalCardsGridStyle.display

      const page3ImageData = page3DataUrl

      // Calculate PDF dimensions FIRST (needed for both PDF and preview)
      // Page 2 a plus d'espace car pas de texte sous les images
      const gridY = 25 // Position de départ pour la grille (même que page 1)
      const pageBottom = 280 // Limite basse de la page (laisse une marge)
      const availableHeight = pageBottom - gridY // 230mm total
      const gridSpacing = 0 // Espacement entre Grid et Cards

      // Optimiser pour la lisibilité des cartes
      const gridImgWidth = 90 // Grille plus petite pour maximiser l'espace des cartes
      const gridImgHeight = gridImgWidth // 90x90
      const cardsImgWidth = 170 // Cartes plus larges pour plus de lisibilité
      const cardsImgHeight = 180 // Hauteur fixe généreuse pour les cartes (priorité lisibilité)

      const gridX = (210 - gridImgWidth) / 2
      const cardsX = (210 - cardsImgWidth) / 2
      const cardsY = gridY + gridImgHeight + gridSpacing

      // Create actual PDF page previews with titles and layout
      const createPdfPagePreview = async (pageNumber: number) => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        // Conversion mm to pixels: 1mm = ~3.78 pixels at 96 DPI
        const mmToPx = 3.78
        canvas.width = 210 * mmToPx // A4 width in pixels
        canvas.height = 297 * mmToPx // A4 height in pixels

        if (!ctx) throw new Error('Canvas context not available')

        // White background - toujours clair pour PDF
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Titre compact en haut (même que PDF)
        ctx.fillStyle = '#000000'
        ctx.font = `16px Arial`
        ctx.textAlign = 'center'
        ctx.fillText(t('pdfModal.title'), canvas.width / 2, 15 * mmToPx)

        // Add content image directly without nested page
        if (pageNumber === 1) {
          // Page 1: Wheel only - SAME dimensions as PDF
          const img = new Image()
          await new Promise(resolve => {
            img.onload = () => {
              const imgSize = 190 * mmToPx // Convert mm to pixels
              const x = (canvas.width - imgSize) / 2
              const y = 25 * mmToPx // Commence plus haut comme dans le PDF
              ctx.drawImage(img, x, y, imgSize, imgSize)
              resolve(undefined)
            }
            img.src = wheelImageData // Use wheelImageData directly
          })
        } else {
          // Page 2: Grid + Cards with EXACT PDF layout
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

          // Draw grid (top) - EXACT same position/size as PDF
          const gridW = gridImgWidth * mmToPx
          const gridH = gridImgHeight * mmToPx
          const gridXPx = gridX * mmToPx
          const gridYPx = gridY * mmToPx
          ctx.drawImage(gridImg, gridXPx, gridYPx, gridW, gridH)

          // Draw cards (bottom) - EXACT same position/size as PDF
          const cardsW = cardsImgWidth * mmToPx
          const cardsH = cardsImgHeight * mmToPx
          const cardsXPx = cardsX * mmToPx
          const cardsYPx = cardsY * mmToPx
          ctx.drawImage(cardsImg, cardsXPx, cardsYPx, cardsW, cardsH)
        }

        // Numéro de page en bas (ajouté APRÈS le contenu pour pas être masqué)
        ctx.fillStyle = '#000000'
        ctx.font = `8px Arial`
        ctx.textAlign = 'center'
        ctx.fillText(`${pageNumber}/2`, canvas.width / 2, 290 * mmToPx)

        return canvas.toDataURL('image/png', 1.0)
      }

      // Generate actual PDF page previews with EXACT same dimensions as PDF
      const page1Preview = await createPdfPagePreview(1)
      const page2Preview = await createPdfPagePreview(2)

      // Save preview images for all pages
      setPreviewImageUrls({
        page1: page1Preview,
        page2: page2Preview,
      })

      // Generate Page 1 - Wheel with cards
      await createPdfPage(1, 'Page 1/2 - Vue Roue Bagua', wheelImageData)

      // Generate Page 2 - Combined Grid + Secteurs détaillés
      pdf.addPage()

      // Titre compact en haut (même style que page 1)
      pdf.setFontSize(16)
      pdf.text(t('pdfModal.title'), 105, 15, { align: 'center' })

      // Use the SAME calculated dimensions as preview
      pdf.addImage(
        gridImageData,
        'PNG',
        gridX,
        gridY,
        gridImgWidth,
        gridImgHeight,
        undefined,
        'FAST'
      )
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

      // Numéro de page en bas (même style que page 1)
      pdf.setFontSize(8)
      pdf.text('2/2', 105, 290, { align: 'center' })

      // Generate blob and URL
      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      console.log('PDF generated successfully with 2 pages: Wheel + Combined Grid/Cards views')
      setPdfUrl(url)
    } catch (error) {
      console.error('Erreur génération PDF détaillée:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur lors de la génération du PDF: ${errorMessage}`)
    } finally {
      // Nettoyer les styles injectés et restaurer l'état normal
      const injectedStyle = document.getElementById('hide-scrollbars-during-pdf')
      if (injectedStyle) {
        document.head.removeChild(injectedStyle)
      }
      document.body.style.overflow = ''
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
        <span className="font-semibold flex items-center">
          <Icon name="lucide:Compass" className="w-5 h-5 mr-2 text-foreground/60" />
          Analyse Feng Shui Bagua
        </span>
      }
      description={
        <span className="block">
          <span className="hidden sm:inline">{t('pdfModal.previewTitle')} • </span>
          {isGenerating ? t('pdfModal.generatingPdf') : t('pdfModal.clickToGenerate')}
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
            {isGenerating ? t('pdfModal.generating') : t('pdfModal.generatePdf')}
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={!pdfUrl || isGenerating}
            className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white flex-1 sm:flex-initial"
          >
            <Icon name="lucide:Download" className="w-4 h-4 mr-2" />
            {t('pdfModal.downloadPdf')}
          </Button>
        </div>
      }
      className="max-w-[800px] w-[95vw] max-h-[95vh] overflow-y-auto"
    >
      {/* LOADER EN HAUT - Toujours visible pendant génération */}
      <div className="flex flex-col items-center gap-4 px-2 sm:px-0">
        {isGenerating && (
          <div
            className="w-full border border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 text-center flex items-center justify-center"
            style={{ minHeight: 'calc(-6rem + 70vh)', maxHeight: 'calc(-6rem + 70vh)' }}
          >
            <div className="flex flex-col items-center gap-6">
              <div className="flex items-center gap-4">
                <Icon name="lucide:FileText" className="w-12 h-12 text-blue-600" />
                <Icon name="lucide:Loader2" className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">{t('pdfModal.generatingInProgress')}</h3>
                <p className="text-sm text-gray-600 mb-1">
                  {t('pdfModal.capturingAnalysis')}
                </p>
                <p className="text-xs text-gray-500">{t('pdfModal.twoPages')}</p>
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
                  L'aperçu n'est pas disponible sur mobile, mais votre PDF 2 pages est prêt.
                </p>
              </div>
            ) : (
              // Desktop: Preview des 2 pages
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-inner">
                {Object.keys(previewImageUrls).length > 0 ? (
                  <div className="space-y-6">
                    {/* Page 1 - Wheel */}
                    {previewImageUrls.page1 && (
                      <img
                        src={previewImageUrls.page1}
                        alt="Page 1 - Roue Bagua"
                        className="w-full h-auto rounded-lg shadow-lg border mx-auto"
                        style={{ maxWidth: '400px' }}
                      />
                    )}

                    {/* Page 2 - Combined Grid + Cards */}
                    {previewImageUrls.page2 && (
                      <img
                        src={previewImageUrls.page2}
                        alt={`Page 2 - ${t('pdfModal.detailedSectors')}`}
                        className="w-full h-auto rounded-lg shadow-lg border mx-auto"
                        style={{ maxWidth: '400px' }}
                      />
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
              cardsMode={undefined}
              cardsRadiusPct={35} // Synchronisé avec cardRadius=280 dans capture PDF
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
            <div
              style={{
                width: '600px',
                height: '600px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ maxWidth: '600px', maxHeight: '600px' }}>
                <BaguaGrid
                  src={planImage}
                  bearingFromNorth={bearingFromNorth}
                  size={600}
                  config={config}
                  cardsMode={undefined}
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
            (visualizationMode === 'wheel' ? DIRECTIONS : DIRECTIONS_WITH_CENTER).map(
              (dir, index) => {
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
                    NO: { x: 5, y: 5 }, // Coin Haut-Gauche EXTERNE
                    N: { x: 50, y: 2 }, // Haut-Centre EXTERNE
                    NE: { x: 95, y: 5 }, // Coin Haut-Droite EXTERNE
                    O: { x: 2, y: 50 }, // Centre-Gauche EXTERNE
                    C: { x: 50, y: 50 }, // Centre (reste au milieu)
                    E: { x: 98, y: 50 }, // Centre-Droite EXTERNE
                    SO: { x: 5, y: 95 }, // Coin Bas-Gauche EXTERNE
                    S: { x: 50, y: 98 }, // Bas-Centre EXTERNE
                    SE: { x: 95, y: 95 }, // Coin Bas-Droite EXTERNE
                  }

                  const position = gridPositions[dir as keyof typeof gridPositions]
                  xPct = position ? position.x : 50
                  yPct = position ? position.y : 50
                }

                // Version ultra-compacte pour PDF
                const sector = config.orientations?.[dir]
                if (!sector) return null

                const accent = sector.colorHex || '#000000'
                const accents = sector.colorHexes || []
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
                          style={{ color: '#6b7280' }} // Toujours gris pour PDF
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
                        <div className="border-t pt-1" style={{ borderColor: pdfBorderColor }}>
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
              }
            )}
        </div>

        {/* Conteneur des VRAIES cartes React pour page 3 en GRILLE */}
        <div
          ref={cardsGridRef}
          style={{
            width: '800px',
            minHeight: '1000px',
            padding: '40px',
            backgroundColor: '#ffffff', // Toujours blanc pour PDF
            position: 'absolute',
            top: '-9999px',
            left: '-9999px',
          }}
        >
          {/* Title */}
          <h2
            style={{
              textAlign: 'center',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#000000', // Toujours noir pour PDF
              marginBottom: '30px',
            }}
          >
            {t('pdfModal.detailedSectors')}
          </h2>

          {/* Grid layout for cards - Positioned like BaguaGrid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(3, 1fr)',
              gap: '20px',
              maxWidth: '720px',
              margin: '0 auto',
              position: 'relative',
            }}
          >
            {planImage &&
              config &&
              DIRECTIONS_WITH_CENTER.map(dir => {
                // Calculer la position dans la grille avec la rotation
                const position = getGridPositionForDirection(dir, rotation)
                const sector = config.orientations?.[dir]
                if (!sector || !position) return null

                const accent = sector.colorHex || '#000000'
                const accents = sector.colorHexes || []
                return (
                  <div
                    key={`grid-card-${dir}`}
                    className="rounded-lg border-2 shadow-lg overflow-hidden"
                    style={{
                      width: '200px',
                      minHeight: '240px',
                      borderColor: accent,
                      backgroundColor: pdfCardBg,
                      margin: '0 auto',
                      gridRow: position.row + 1,
                      gridColumn: position.col + 1,
                    }}
                  >
                    {/* Header compact avec couleur de fond - IDENTIQUE */}
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
                      {dir} • {sector.element} • {sector.number}
                    </div>

                    {/* Contenu compact - PAGE 2 ENRICHIE */}
                    <div className="p-2 space-y-1">
                      {/* Titre */}
                      <div
                        className="text-xs font-semibold flex items-center justify-center gap-2 text-center"
                        style={{ color: pdfTextColor }}
                      >
                        {sector.title}
                      </div>

                      {/* Summary avec icône du secteur - NOUVEAU pour page 2 */}
                      {sector.summary && (
                        <div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: '#6b7280' }}
                        >
                          <Icon name={(sector.icon as any) || 'lucide:Info'} className="w-3 h-3 mr-1" style={{ color: accent }} />
                          {sector.summary.length > 35 ? sector.summary.substring(0, 32) + '...' : sector.summary}
                        </div>
                      )}

                      {/* Relations éléments - NOUVEAU pour page 2 */}
                      {(sector.nourisher || sector.controller) && (
                        <div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: '#6b7280' }}
                        >
                          <Icon name="lucide:ArrowRightLeft" className="w-3 h-3 mr-1" style={{ color: accent }} />
                          {sector.nourisher && `${t('bagua.nourishedBy')}: ${sector.nourisher}`}
                          {sector.nourisher && sector.controller && ' • '}
                          {sector.controller && `${t('bagua.controlledBy')}: ${sector.controller}`}
                        </div>
                      )}

                      {/* Matières recommandées - NOUVEAU pour page 2 */}
                      {sector.matiere && (
                        <div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: '#6b7280' }}
                        >
                          <Icon name="lucide:Layers" className="w-3 h-3 mr-1" style={{ color: accent }} />
                          {sector.matiere.length > 32 ? sector.matiere.substring(0, 29) + '...' : sector.matiere}
                        </div>
                      )}

                      {/* Premier tip ou enhancer */}
                      {(sector.tips?.[0] || sector.enhancers?.[0]) && (
                        <div
                          className="text-[9px] leading-tight flex items-center"
                          style={{ color: '#6b7280' }} // Toujours gris pour PDF
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
                        <div className="border-t pt-1" style={{ borderColor: pdfBorderColor }}>
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
      </div>
    </Modal>
  )
}
