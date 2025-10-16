'use client'

import { Receipt } from '@ezbill/types'
import { callApi } from '@/utils/api'
import { getUserId } from './get-user-id'

/**
 * Get receipt by invoice ID
 */
export async function getReceiptByInvoiceId(invoiceId: string): Promise<Receipt | null> {
  try {
    const userId = getUserId()

    // Get all receipts for this user
    const receiptsRes = await callApi<Receipt[]>('/receipts', { userId })

    if (!receiptsRes.ok || !receiptsRes.data) {
      return null
    }

    // Find the receipt for this invoice
    const receipt = receiptsRes.data.find(r => r.invoiceId === invoiceId)
    return receipt || null

  } catch (error) {
    console.error('Error fetching receipt by invoice ID:', error)
    return null
  }
}

/**
 * Download receipt PDF by invoice ID
 */
export async function downloadReceiptByInvoiceId(invoiceId: string): Promise<void> {
  try {
    const receipt = await getReceiptByInvoiceId(invoiceId)

    if (!receipt) {
      console.warn('No receipt found for invoice:', invoiceId)
      return
    }

    // Download the receipt PDF
    const userId = getUserId()
    const downloadUrl = `/receipts/${receipt._id}/download`

    const response = await callApi(downloadUrl, {
      userId,
      method: 'GET',
      headers: {
        'Accept': 'application/pdf'
      }
    })

    if (response.ok && response.data) {
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Receipt-${receipt.documentNumber}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    }

  } catch (error) {
    console.error('Error downloading receipt:', error)
  }
}