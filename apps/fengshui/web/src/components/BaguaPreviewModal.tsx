'use client'

import { Direction, DIRECTIONS_WITH_CENTER } from '@/types/directions'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Button, Icon, Modal } from '@ezstart/ui/components'
import React, { useState } from 'react'
import BaguaWheelPDF from './BaguaWheelPDF'

type Props = {
  isOpen: boolean
  onClose: () => void
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
}

export function BaguaPreviewModal({
  isOpen,
  onClose,
  config,
  planImage,
  bearingFromNorth,
}: Props) {
  const [pdfBlob, setPdfBlob] = useState<string | null>(null)
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  // Générer le preview automatiquement à l'ouverture
  React.useEffect(() => {
    if (isOpen && !pdfBlob && !isGeneratingPreview) {
      const generatePreview = async () => {
        setIsGeneratingPreview(true)
        try {
          const { pdf } = await import('@react-pdf/renderer')
          const blob = await pdf(
            <BaguaWheelPDF
              config={config}
              planImage={planImage}
              bearingFromNorth={bearingFromNorth}
            />
          ).toBlob()

          const url = URL.createObjectURL(blob)
          setPdfBlob(url)
        } catch (error) {
          console.error('Erreur génération preview PDF:', error)
        } finally {
          setIsGeneratingPreview(false)
        }
      }
      generatePreview()
    }
  }, [isOpen, pdfBlob, isGeneratingPreview, config, planImage, bearingFromNorth])

  const handleGeneratePreview = async () => {
    setIsGeneratingPreview(true)
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const blob = await pdf(
        <BaguaWheelPDF
          config={config}
          planImage={planImage}
          bearingFromNorth={bearingFromNorth}
        />
      ).toBlob()

      const url = URL.createObjectURL(blob)
      if (pdfBlob) {
        URL.revokeObjectURL(pdfBlob)
      }
      setPdfBlob(url)
    } catch (error) {
      console.error('Erreur génération preview PDF:', error)
      alert('Erreur lors de la génération du preview PDF')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer')
      const blob = await pdf(
        <BaguaWheelPDF
          config={config}
          planImage={planImage}
          bearingFromNorth={bearingFromNorth}
        />
      ).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `analyse-bagua-${config.year || new Date().getFullYear()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur téléchargement PDF:', error)
      alert('Erreur lors du téléchargement du PDF')
    }
  }

  // Nettoyer l'URL quand le modal se ferme
  const handleClose = () => {
    if (pdfBlob) {
      URL.revokeObjectURL(pdfBlob)
      setPdfBlob(null)
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        <>
          <Icon name="lucide:Compass" className="w-5 h-5 mr-2 text-foreground/60" />
          <span className="font-semibold">Analyse Feng Shui Bagua</span>
        </>
      }
      description={
        <>
          Aperçu de votre rapport PDF • Cliquez sur <kbd className="px-1 py-0.5 border rounded">Échap</kbd> pour fermer
        </>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGeneratePreview}
              disabled={isGeneratingPreview}
              className="hover:bg-gray-50"
            >
              <Icon
                name={isGeneratingPreview ? 'lucide:Loader2' : 'lucide:Eye'}
                className={`w-4 h-4 mr-2 ${isGeneratingPreview ? 'animate-spin' : ''}`}
              />
              {isGeneratingPreview ? 'Génération...' : 'Actualiser'}
            </Button>
            <Button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPreview}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
            >
              <Icon
                name="lucide:Download"
                className="w-4 h-4 mr-2"
              />
              Télécharger PDF
            </Button>
          </div>
        </div>
      }
      className="max-w-[1100px] w-[98vw]"
    >
      {/* PDF container */}
      <div className="">
        {pdfBlob ? (
          <>
            {/* Desktop PDF Preview */}
            <iframe
              src={`${pdfBlob}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
              className="hidden sm:block w-full h-[50vh]"
              title="Analyse Bagua – Aperçu PDF"
            />
            {/* Mobile PDF Download */}
            <div className="sm:hidden flex flex-col items-center justify-center p-8 text-center h-[50vh] bg-muted/20 rounded-lg">
              <div className="w-16 h-16 bg-gradient-to-r from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mb-4">
                <Icon name="lucide:FileDown" className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">PDF Prêt</h3>
              <p className="text-foreground/60 mb-4 text-sm">
                L'aperçu PDF n'est pas supporté sur mobile. Téléchargez pour visualiser.
              </p>
              <Button
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = pdfBlob
                  link.download = `analyse-bagua-${config.year || new Date().getFullYear()}.pdf`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                <Icon name="lucide:Download" className="w-4 h-4 mr-2" />
                Télécharger PDF
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
            <div className="w-20 h-20 bg-gradient-to-r from-red-100 to-orange-100 rounded-2xl flex items-center justify-center mb-6">
              <Icon
                name={isGeneratingPreview ? 'lucide:Loader2' : 'lucide:Compass'}
                className={`w-10 h-10 text-red-500 ${isGeneratingPreview ? 'animate-spin' : ''}`}
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {isGeneratingPreview ? 'Génération de l\'aperçu PDF...' : 'Génération PDF Instantanée'}
            </h3>
            <p className="text-foreground/60 mb-6 max-w-md">
              {isGeneratingPreview
                ? 'Veuillez patienter pendant la génération de votre aperçu PDF...'
                : 'Cliquez sur "Actualiser" pour générer et prévisualiser votre analyse Feng Shui Bagua.'}
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Icon name="lucide:Zap" className="w-4 h-4 text-yellow-500" />
              <span>Génération côté client • Aucun serveur requis</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}