'use client'

import { useState, useCallback } from 'react'
import { pdf } from '@react-pdf/renderer'
import type { YearBaguaConfig } from '@/types/yearBaguaConfig'
import BaguaPDFDocument from '@/components/BaguaPDFDocument'

type GeneratePDFOptions = {
  config: YearBaguaConfig
  planImage?: string
  bearingFromNorth: number
  filename?: string
}

export function useBaguaPDF() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generatePDF = useCallback(async ({
    config,
    planImage,
    bearingFromNorth,
    filename = 'analyse-bagua-fengshui.pdf'
  }: GeneratePDFOptions) => {
    try {
      setIsGenerating(true)

      // Créer le document PDF
      const doc = BaguaPDFDocument({ 
        config, 
        planImage, 
        bearingFromNorth 
      })

      // Générer le blob PDF
      const blob = await pdf(doc).toBlob()

      // Télécharger le fichier
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return true
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error)
      return false
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return {
    generatePDF,
    isGenerating
  }
}