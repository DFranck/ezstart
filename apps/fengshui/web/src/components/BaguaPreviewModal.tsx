'use client'

import { DIRECTIONS } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Button, Icon, Modal } from '@ezstart/ui/components'
import { useEffect, useRef, useState } from 'react'
import BaguaWheel from './steps/BaguaWheel'

type Props = {
  isOpen: boolean
  onClose: () => void
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
}

export function BaguaPreviewModal({ isOpen, onClose, config, planImage, bearingFromNorth }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const baguaRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)

  const generatePDF = async () => {
    try {
      setIsGenerating(true)
      console.log('Starting PDF generation with iframe-safe approach...')

      // Attendre que l'élément soit rendu
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (!baguaRef.current) {
        console.error('Bagua element still not found after delay')
        throw new Error('Bagua element not found - make sure the modal is open')
      }

      console.log('Bagua element found:', baguaRef.current)

      // Rendre l'élément temporairement visible pour la capture
      const originalDisplay = baguaRef.current.style.display

      // Rendre visible pour capture (display: block au lieu de none)
      baguaRef.current.style.display = 'block'

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

      const dataUrl = await domtoimage.toPng(baguaRef.current, {
        quality: 1,
        width: captureSize,
        height: captureSize,
        bgcolor: '#ffffff', // Fond blanc propre
        pixelRatio: 2, // Force haute résolution
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

      console.log('dom-to-image capture successful, data URL length:', dataUrl.length)

      // Créer un canvas à partir du dataURL pour jsPDF
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
        img.src = dataUrl
      })

      console.log('Canvas created successfully:', canvas.width, 'x', canvas.height)

      // Remettre l'élément masqué après capture
      baguaRef.current.style.display = originalDisplay

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      // Add title (sans emoji pour meilleur centrage)
      pdf.setFontSize(20)
      pdf.text('Analyse Feng Shui Bagua', 105, 30, { align: 'center' })

      pdf.setFontSize(12)
      pdf.text(
        `Configuration ${config.year || '2025'} - Orientation ${Math.round(bearingFromNorth)}°`,
        105,
        45,
        { align: 'center' }
      )

      // Capturer les BaguaSectorCard rendues en React
      console.log('Capturing BaguaSectorCard components...')

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
        pixelRatio: 2, // Haute résolution pour les cartes aussi
        width: 800 * 2, // Taille du conteneur * 2
        height: 800 * 2,
        style: {
          transform: 'scale(2)', // Scale 2x pour haute résolution
          transformOrigin: 'top left',
          width: '800px',
          height: '800px',
        },
      })

      // Remettre masqué
      cardsRef.current.style.display = originalCardsDisplay

      // Créer une image des cartes pour le PDF
      const cardsImg = new Image()
      await new Promise(resolve => {
        cardsImg.onload = resolve
        cardsImg.src = cardsDataUrl
      })

      // Dessiner les cartes sur le PDF en superposition avec l'image Bagua
      const cardsCanvas = document.createElement('canvas')
      const cardsCtx = cardsCanvas.getContext('2d')
      cardsCanvas.width = canvas.width // Utilise la taille haute résolution
      cardsCanvas.height = canvas.height

      // Dessiner l'image Bagua de base (haute résolution)
      cardsCtx?.drawImage(canvas, 0, 0)

      // Superposer les cartes - aligner sur l'image Bagua haute résolution
      // L'image Bagua fait maintenant 1200px dans un canvas de même taille
      // Le conteneur des cartes fait 1600px (800*2) avec les cartes proportionnelles
      const baguaImageSize = captureSize // 1200px
      const cardsContainerSize = 800 * 2 // 1600px (haute résolution)

      // Échelle pour que les cartes soient proportionnelles à l'image Bagua haute résolution
      const scale = canvas.width / cardsContainerSize // Échelle adaptée à la haute résolution
      const cardsWidth = cardsImg.width * scale
      const cardsHeight = cardsImg.height * scale

      // Centrer parfaitement sur l'image Bagua haute résolution
      const cardsX = (canvas.width - cardsWidth) / 2
      const cardsY = (canvas.height - cardsHeight) / 2

      cardsCtx?.drawImage(cardsImg, cardsX, cardsY, cardsWidth, cardsHeight)

      // Utiliser le canvas combiné pour le PDF
      const combinedCanvas = cardsCanvas
      console.log(
        'Combined canvas created successfully:',
        combinedCanvas.width,
        'x',
        combinedCanvas.height
      )

      // Add the captured image - TAILLE MAXIMALE sur la page PDF avec qualité optimale
      const imgData = combinedCanvas.toDataURL('image/png', 1.0) // Qualité PNG maximale
      // Utiliser quasiment toute la largeur A4 avec marges
      const maxWidth = 190 // 210mm - 40mm de marges (20mm de chaque côté)
      const imgWidth = maxWidth
      const imgHeight = maxWidth // Image carrée
      const x = (210 - imgWidth) / 2 // Center on A4 width
      const y = 55

      // Ajouter l'image avec compression optimale pour PDF
      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight, undefined, 'FAST')

      // Add orientation info
      pdf.setFontSize(12)
      pdf.text(
        `Orientation : ${Math.round(bearingFromNorth)}° depuis le Nord`,
        105,
        y + imgHeight + 15,
        { align: 'center' }
      )

      // Generate blob and URL
      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      console.log('PDF generated successfully with direction cards')
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
      {/* Bagua Wheel Preview */}
      <div className="flex flex-col items-center gap-2 sm:gap-4 px-2 sm:px-0">
        {/* BaguaWheel MASQUÉ pour capture PDF uniquement */}
        <div
          ref={baguaRef}
          className="bg-white rounded-2xl  shadow-lg"
          style={{
            width: 'fit-content',
            minWidth: '600px',
            minHeight: '600px',
            display: 'none',
          }}
          data-bagua="container"
        >
          {planImage && config ? (
            <BaguaWheel
              src={planImage}
              bearingFromNorth={bearingFromNorth}
              size={600}
              config={config}
              radiusPct={46}
              insetRatio={1.0}
              labelOffset={12}
              cardsMode="hover"
              cardsRadiusPct={60}
            />
          ) : (
            <div className="flex items-center justify-center w-[600px] h-[600px]">
              <p className="text-gray-500">Chargement de la roue Bagua...</p>
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
            DIRECTIONS.map((dir, index) => {
              const angle = index * 45
              const totalRotation = bearingFromNorth + (config?.rotationOffsetDeg ?? 0)
              const adjustedAngle = angle + totalRotation
              const radian = ((adjustedAngle - 90) * Math.PI) / 180

              // Position en cercle (en pixels dans le conteneur 800x800)
              // Le plan Bagua fait ~600px, on veut les cartes autour à une distance raisonnable
              const cardRadius = 320 // Distance du centre pour que les cartes encadrent bien le plan
              const centerX = 400
              const centerY = 400
              const cardX = centerX + cardRadius * Math.cos(radian)
              const cardY = centerY + cardRadius * Math.sin(radian)

              // Conversion en pourcentages pour BaguaSectorCard
              const xPct = (cardX / 800) * 100
              const yPct = (cardY / 800) * 100

              // Version ultra-compacte pour PDF
              const sector = config.orientations?.[dir]
              if (!sector) return null

              const accent = sector.colorHex
              const accents = sector.colorHexes
              return (
                <div
                  key={`pdf-card-${dir}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 bg-white shadow-lg overflow-hidden"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    width: '120px',
                    borderColor: accent,
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
                    <div className="text-xs font-semibold text-gray-900 flex items-center justify-center gap-2 text-center">
                      {sector.title}
                    </div>

                    {/* Premier tip ou enhancer */}
                    {(sector.tips?.[0] || sector.enhancers?.[0]) && (
                      <div className="text-[9px] text-gray-500 leading-tight flex items-center">
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
                      <div className="border-t border-gray-200 pt-1">
                        <div className="text-[9px] text-gray-500 leading-tight flex items-center">
                          <Icon
                            name="lucide:Star"
                            className="w-3 h-3 mr-1"
                            style={{
                              color: sector.star.status === 'bonne' ? '#22c55e' : '#ef4444',
                            }}
                          />
                          {sector.star.star} - {sector.star.element}
                        </div>
                        <div className="text-[9px] text-gray-500 leading-tight flex items-center">
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

        {/* PDF Preview si généré */}
        {pdfUrl && (
          <div className="w-full mt-4 overflow-auto" style={{ aspectRatio: '210/297' }}>
            <iframe
              src={pdfUrl}
              className="w-full h-full border border-gray-200 rounded-lg shadow-inner"
              title="Aperçu PDF Bagua"
              style={{ minHeight: '300px', maxHeight: '70vh' }}
            />
          </div>
        )}
      </div>
    </Modal>
  )
}
