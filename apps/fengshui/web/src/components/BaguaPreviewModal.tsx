'use client'

import { Transformations } from '@/types/bagua'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import { Button, Div, Icon, Modal, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { generatePDF, handleDownloadPDF } from './bagua-preview/pdf-generator'
import { PdfCaptureContainers } from './bagua-preview/pdf-capture-containers'
import { PdfPreview } from './bagua-preview/pdf-preview'

type Props = {
  isOpen: boolean
  onClose: () => void
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
  visualizationMode?: 'wheel' | 'grid'
  transformations?: Transformations
  isPremium?: boolean
}

export function BaguaPreviewModal({
  isOpen,
  onClose,
  config,
  planImage,
  bearingFromNorth,
  transformations,
  isPremium = false,
}: Props) {
  const t = useTranslations()
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [previews, setPreviews] = useState<string[]>([])
  const [pageCount, setPageCount] = useState(0)
  const wheelRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const cardsGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleGenerate = async () => {
    await generatePDF({
      wheelRef,
      gridRef,
      cardsGridRef,
      config,
      bearingFromNorth,
      onPdfUrl: setPdfUrl,
      onResult: ({ previews: p, pageCount: c }) => {
        setPreviews(p)
        setPageCount(c)
      },
      onGeneratingChange: setIsGenerating,
    })
  }

  // Generate PDF when modal opens
  useEffect(() => {
    if (isOpen && !pdfUrl) {
      handleGenerate()
    }
  }, [isOpen, pdfUrl])

  // Cleanup URL when modal closes
  useEffect(() => {
    if (!isOpen && pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
      setPdfUrl(null)
      setPreviews([])
      setPageCount(0)
    }
  }, [isOpen, pdfUrl])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <Span className="font-semibold flex items-center">
          <Icon name="lucide:Compass" className="w-5 h-5 mr-2 text-foreground/60" />
          Analyse Feng Shui Bagua
        </Span>
      }
      description={
        <Span className="block">
          <Span className="hidden sm:inline">{t('pdfModal.previewTitle')} </Span>
          {isGenerating ? t('pdfModal.generatingPdf') : t('pdfModal.clickToGenerate')}
        </Span>
      }
      footer={
        <Div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-2">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 sm:flex-initial"
          >
            <Icon name="lucide:FileText" className="w-4 h-4 mr-2" />
            {isGenerating ? t('pdfModal.generating') : t('pdfModal.generatePdf')}
          </Button>
          <Button
            onClick={() => handleDownloadPDF(pdfUrl, config.year)}
            disabled={!pdfUrl || isGenerating}
            className="bg-gradient-to-r from-destructive to-warning hover:from-destructive/90 hover:to-warning/90 text-white flex-1 sm:flex-initial"
          >
            <Icon name="lucide:Download" className="w-4 h-4 mr-2" />
            {t('pdfModal.downloadPdf')}
          </Button>
        </Div>
      }
      className="max-w-[800px] w-[95vw] max-h-[95vh] overflow-y-auto"
    >
      <PdfPreview
        isGenerating={isGenerating}
        isMobile={isMobile}
        pdfUrl={pdfUrl}
        previews={previews}
        pageCount={pageCount}
      />

      {/* Hidden capture containers for PDF generation */}
      <PdfCaptureContainers
        wheelRef={wheelRef}
        gridRef={gridRef}
        cardsGridRef={cardsGridRef}
        planImage={planImage}
        bearingFromNorth={bearingFromNorth}
        config={config}
        transformations={transformations}
        isPremium={isPremium}
      />
    </Modal>
  )
}
