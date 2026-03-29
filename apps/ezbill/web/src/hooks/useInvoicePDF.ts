'use client'

import { logger } from '@ezstart/logger'
import { useGeneratePDF } from './use-generate-pdf'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

/**
 * EZBill-specific hook for generating invoice PDFs.
 *
 * Wraps the generic useGeneratePDF hook with invoice-specific filename formatting.
 *
 * @returns Object with downloadInvoicePDF function, loading state, and error
 *
 * @example
 * const { downloadInvoicePDF, isGenerating, error } = useInvoicePDF()
 *
 * // Download invoice PDF
 * await downloadInvoicePDF(<InvoicePDF data={invoice} />, invoice.number)
 * // Generates: invoice-INV-001.pdf
 */
export function useInvoicePDF() {
  const { downloadPDF, isGenerating, error } = useGeneratePDF({
    onSuccess: () => logger.info('Invoice PDF generated successfully'),
    onError: error => logger.error('Invoice PDF generation failed:', error),
  })

  /**
   * Downloads an invoice as a PDF file.
   *
   * @param component - React PDF component to render
   * @param documentNumber - Invoice number (e.g., "INV-001")
   */
  const downloadInvoicePDF = async (
    component: ReactElement<DocumentProps>,
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
