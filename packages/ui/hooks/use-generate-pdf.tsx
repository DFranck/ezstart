import { pdf, type DocumentProps } from '@react-pdf/renderer'
import React, { useState } from 'react'

interface UseGeneratePDFOptions {
  filename?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface UseGeneratePDFReturn {
  generatePDF: (component: React.ReactElement<DocumentProps>) => Promise<void>
  downloadPDF: (component: React.ReactElement<DocumentProps>, filename?: string) => Promise<void>
  isGenerating: boolean
  error: Error | null
}

export function useGeneratePDF(options: UseGeneratePDFOptions = {}): UseGeneratePDFReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generatePDF = async (component: React.ReactElement<DocumentProps>): Promise<void> => {
    setIsGenerating(true)
    setError(null)

    try {
      const blob = await pdf(component).toBlob()
      return Promise.resolve()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate PDF')
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadPDF = async (component: React.ReactElement<DocumentProps>, filename?: string): Promise<void> => {
    setIsGenerating(true)
    setError(null)

    try {
      const blob = await pdf(component).toBlob()
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || options.filename || 'document.pdf'
      
      // Déclencher le téléchargement
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Nettoyer l'URL
      URL.revokeObjectURL(url)
      
      options.onSuccess?.()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to generate PDF')
      setError(error)
      options.onError?.(error)
      throw error
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    generatePDF,
    downloadPDF,
    isGenerating,
    error,
  }
}

// Hook spécialisé pour les factures
export function useInvoicePDF() {
  const { downloadPDF, isGenerating, error } = useGeneratePDF({
    onSuccess: () => console.log('PDF generated successfully'),
    onError: (error) => console.error('PDF generation failed:', error),
  })

  const downloadInvoicePDF = async (
    component: React.ReactElement<DocumentProps>,
    documentNumber: string
  ) => {
    const filename = `invoice-${documentNumber}.pdf`
    await downloadPDF(component, filename)
  }

  return {
    downloadInvoicePDF,
    isGenerating,
    error,
  }
}