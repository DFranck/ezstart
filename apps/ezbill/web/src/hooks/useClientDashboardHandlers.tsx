'use client'

import { useBillingContext } from '@/contexts/billing-context'
import { convertToInvoicePDFData, convertToReceiptPDFData } from '@/utils/pdf-converters'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import { InvoicePDF, ReceiptPDF } from '@ezbill/templates'
import { useAuth } from '@ezstart/auth-sdk'
import { callApi } from '@/config/api'
import React from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

export function useClientDashboardHandlers() {
  const { clients, companies, paymentMethods, receipts, refetchAll } = useBillingContext()
  const { user } = useAuth()
  const userId = user?._id
  const t = useTranslations('toast')

  const generateInvoicePdfUrl = async (invoice: Invoice): Promise<string | null> => {
    try {
      const client = clients.find(c => c._id === invoice.clientId)
      const company = invoice.companyId
        ? companies.find(c => c._id === invoice.companyId)
        : undefined

      if (!client) {
        return null
      }

      const pdfData = convertToInvoicePDFData(invoice, client, company, paymentMethods)
      const { pdf } = await import('@react-pdf/renderer')
      const blob = await pdf(<InvoicePDF data={pdfData} />).toBlob()
      return URL.createObjectURL(blob)
    } catch (error) {
      return null
    }
  }

  const markInvoiceAsSent = async (invoice: Invoice) => {
    try {
      const response = await callApi(`/invoices/${invoice._id}`, {
        method: 'PUT',
        userId: userId,
        body: {
          status: 'sent',
        },
      })

      if (response.ok) {
        await refetchAll()
        return true
      } else {
        toast.error(t('invoiceSendFailed'))
        return false
      }
    } catch (error) {
      toast.error(t('invoiceSendError'))
      return false
    }
  }

  const handleSendInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await markInvoiceAsSent(invoice)
  }

  const handleDownloadInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const client = clients.find(c => c._id === invoice.clientId)
      const company = invoice.companyId
        ? companies.find(c => c._id === invoice.companyId)
        : undefined

      if (!client) {
        toast.error(t('clientNotFound'))
        return
      }

      const pdfData = convertToInvoicePDFData(invoice, client, company, paymentMethods)
      const fileName = invoice.documentNumber || invoice._id

      const { pdf } = await import('@react-pdf/renderer')

      const blob = await pdf(<InvoicePDF data={pdfData} />).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `invoice-${fileName}.pdf`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(t('invoiceDownloadError'))
    }
  }

  const handleDownloadReceipt = async (receipt: Receipt, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const client = clients.find(c => c._id === receipt.clientId)
      const company = receipt.companyId
        ? companies.find(c => c._id === receipt.companyId)
        : undefined

      if (!client) {
        toast.error(t('clientNotFound'))
        return
      }

      const receiptPDFData = convertToReceiptPDFData(receipt, client, company)
      const fileName = receipt.documentNumber || receipt._id

      const { pdf } = await import('@react-pdf/renderer')

      const blob = await pdf(<ReceiptPDF data={receiptPDFData} />).toBlob()

      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `receipt-${fileName}.pdf`

      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Cleanup
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error(t('receiptDownloadError'))
    }
  }

  const handleDownloadReceiptByInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const receipt = receipts.find(r => r.invoiceId === invoice._id)

      if (!receipt) {
        toast.error(t('receiptNotFound'))
        return
      }

      await handleDownloadReceipt(receipt, e)
    } catch (error) {
      toast.error(t('receiptDownloadError'))
    }
  }

  const handleConvertToInvoice = (quote: Quote) => {
    return {
      clientId: quote.clientId,
      companyId: quote.companyId,
      items: quote.items,
      currency: quote.currency,
      notes: quote.notes,
      terms: quote.terms,
      taxRate: quote.taxRate,
      status: 'draft' as const,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  }

  const generateQuotePdfUrl = async (quote: Quote): Promise<string | null> => {
    try {
      const client = clients.find(c => c._id === quote.clientId)
      const company = quote.companyId ? companies.find(c => c._id === quote.companyId) : undefined

      if (!client) {
        return null
      }

      // TODO: Implement QuotePDF component and converter
      // For now, return null
      return null
    } catch (error) {
      return null
    }
  }

  const markQuoteAsSent = async (quote: Quote) => {
    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'PUT',
        userId: userId,
        body: {
          status: 'sent',
        },
      })

      if (response.ok) {
        await refetchAll()
        return true
      } else {
        toast.error(t('quoteSendFailed'))
        return false
      }
    } catch (error) {
      toast.error(t('quoteSendError'))
      return false
    }
  }

  const handleSendQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()
    await markQuoteAsSent(quote)
  }

  const handleAcceptQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'PUT',
        userId: userId,
        body: {
          status: 'accepted',
        },
      })

      if (response.ok) {
        await refetchAll()
      } else {
        toast.error(t('quoteAcceptFailed'))
      }
    } catch (error) {
      toast.error(t('quoteAcceptError'))
    }
  }

  const handleDeclineQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'PUT',
        userId: userId,
        body: {
          status: 'rejected',
        },
      })

      if (response.ok) {
        await refetchAll()
      } else {
        toast.error(t('quoteDeclineFailed'))
      }
    } catch (error) {
      toast.error(t('quoteDeclineError'))
    }
  }

  const handleDownloadQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const client = clients.find(c => c._id === quote.clientId)
      const company = quote.companyId ? companies.find(c => c._id === quote.companyId) : undefined

      if (!client) {
        toast.error(t('clientNotFound'))
        return
      }

      const fileName = quote.documentNumber || quote._id
      // TODO: Implement quote PDF generation if not exists
      toast.error(t('quoteDownloadNotImplemented'))
    } catch (error) {
      toast.error(t('quoteDownloadError'))
    }
  }

  const handleDeleteQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'DELETE',
        userId: userId,
      })

      if (response.ok) {
        await refetchAll()
      } else {
        toast.error(t('quoteDeleteFailed'))
      }
    } catch (error) {
      toast.error(t('quoteDeleteError'))
    }
  }

  return {
    handleSendInvoice,
    handleDownloadInvoice,
    handleDownloadReceipt,
    handleDownloadReceiptByInvoice,
    handleConvertToInvoice,
    handleSendQuote,
    handleAcceptQuote,
    handleDeclineQuote,
    handleDownloadQuote,
    handleDeleteQuote,
    generateInvoicePdfUrl,
    generateQuotePdfUrl,
    markInvoiceAsSent,
    markQuoteAsSent,
  }
}
