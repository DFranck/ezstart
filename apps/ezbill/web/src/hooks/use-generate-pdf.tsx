'use client'

import { pdf } from '@react-pdf/renderer'
import { useState } from 'react'

interface UseGeneratePDFOptions {
  filename?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

interface UseGeneratePDFReturn {
  generatePDF: (component: React.ReactElement) => Promise<void>
  downloadPDF: (component: React.ReactElement, filename?: string) => Promise<void>
  isGenerating: boolean
  error: Error | null
}

/**
 * Generic hook for generating and downloading PDF documents.
 *
 * Uses @react-pdf/renderer to convert React components into PDF files.
 *
 * @param options - Configuration options
 * @param options.filename - Default filename for downloads (default: 'document.pdf')
 * @param options.onSuccess - Callback triggered after successful PDF generation
 * @param options.onError - Callback triggered if PDF generation fails
 *
 * @returns Object with generatePDF, downloadPDF functions, loading state, and error
 *
 * @example
 * const { downloadPDF, isGenerating, error } = useGeneratePDF({
 *   filename: 'report.pdf',
 *   onSuccess: () => toast.success('PDF downloaded'),
 *   onError: (err) => toast.error(err.message),
 * })
 *
 * // Download PDF with custom filename
 * await downloadPDF(<MyPDFDocument />, 'custom-name.pdf')
 *
 * @example
 * // Generate PDF blob without downloading
 * const { generatePDF } = useGeneratePDF()
 * await generatePDF(<MyPDFDocument />)
 */
export function useGeneratePDF(options: UseGeneratePDFOptions = {}): UseGeneratePDFReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const generatePDF = async (component: React.ReactElement): Promise<void> => {
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

  const downloadPDF = async (component: React.ReactElement, filename?: string): Promise<void> => {
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
