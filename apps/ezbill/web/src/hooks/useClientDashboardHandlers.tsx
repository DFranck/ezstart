'use client'

import { useBillingContext } from '@/contexts/billing-context'
import { getUserId } from '@/utils/get-user-id'
import { convertToInvoicePDFData, convertToReceiptPDFData } from '@/utils/pdf-converters'
import { Client, Company, Invoice, PaymentMethod, Quote, Receipt } from '@ezbill/types'
import { InvoicePDF, ReceiptPDF } from '@ezstart/ui/templates'
import { callApi } from '@ezstart/ui/utils'
import React from 'react'

export function useClientDashboardHandlers() {
  const { clients, companies, paymentMethods, receipts, refetchAll } = useBillingContext()

  const handleSendInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const response = await callApi(`/invoices/${invoice._id}`, {
        method: 'PUT',
        userId: getUserId(),
        body: {
          status: 'sent',
        },
      })

      if (response.ok) {
        await refetchAll()
      } else {
        alert('Failed to send invoice')
      }
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Error sending invoice')
    }
  }

  const handleDownloadInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const client = clients.find(c => c._id === invoice.clientId)
      const company = invoice.companyId
        ? companies.find(c => c._id === invoice.companyId)
        : undefined

      if (!client) {
        alert('Client not found')
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
      console.error('Error downloading invoice:', error)
      alert('Error downloading invoice')
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
        alert('Client not found')
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
      console.error('Error downloading receipt:', error)
      console.error('Receipt data:', receipt)
      const client = clients.find(c => c._id === receipt.clientId)
      const company = receipt.companyId
        ? companies.find(c => c._id === receipt.companyId)
        : undefined
      console.error('Client data:', client)
      console.error('Company data:', company)
      alert(`Error downloading receipt: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleDownloadReceiptByInvoice = async (invoice: Invoice, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const receipt = receipts.find(r => r.invoiceId === invoice._id)

      if (!receipt) {
        alert('No receipt found for this invoice')
        return
      }

      await handleDownloadReceipt(receipt, e)
    } catch (error) {
      console.error('Error downloading receipt for invoice:', error)
      alert('Error downloading receipt')
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

  const handleSendQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'PUT',
        userId: getUserId(),
        body: {
          status: 'sent',
        },
      })

      if (response.ok) {
        await refetchAll()
      } else {
        alert('Failed to send quote')
      }
    } catch (error) {
      console.error('Error sending quote:', error)
      alert('Error sending quote')
    }
  }

  const handleAcceptQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'PUT',
        userId: getUserId(),
        body: {
          status: 'accepted',
        },
      })

      if (response.ok) {
        await refetchAll()
      } else {
        alert('Failed to accept quote')
      }
    } catch (error) {
      console.error('Error accepting quote:', error)
      alert('Error accepting quote')
    }
  }

  const handleDeclineQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'PUT',
        userId: getUserId(),
        body: {
          status: 'rejected',
        },
      })

      if (response.ok) {
        await refetchAll()
      } else {
        alert('Failed to decline quote')
      }
    } catch (error) {
      console.error('Error declining quote:', error)
      alert('Error declining quote')
    }
  }

  const handleDownloadQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    try {
      const client = clients.find(c => c._id === quote.clientId)
      const company = quote.companyId
        ? companies.find(c => c._id === quote.companyId)
        : undefined

      if (!client) {
        alert('Client not found')
        return
      }

      const fileName = quote.documentNumber || quote._id
      // TODO: Implement quote PDF generation if not exists
      alert('Quote PDF download not implemented yet')
    } catch (error) {
      console.error('Error downloading quote:', error)
      alert('Error downloading quote')
    }
  }

  const handleDeleteQuote = async (quote: Quote, e?: React.MouseEvent) => {
    e?.stopPropagation()

    const confirmed = confirm(
      `Are you sure you want to delete quote ${quote.documentNumber}? This will move it to trash.`
    )

    if (!confirmed) return

    try {
      const response = await callApi(`/quotes/${quote._id}`, {
        method: 'DELETE',
        userId: getUserId(),
      })

      if (response.ok) {
        await refetchAll()
      } else {
        alert('Failed to delete quote')
      }
    } catch (error) {
      console.error('Error deleting quote:', error)
      alert('Error deleting quote')
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
  }
}
