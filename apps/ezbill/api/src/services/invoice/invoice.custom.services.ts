import { AddLineItem, Invoice, Receipt } from '@ezbill/types'
import { logger } from '@ezstart/logger/server'
import { getInvoiceModel } from '../../models/billing/invoice.js'
import { toApiObject } from '../../utils/mongoose/to-api-object.js'

export async function assignClientToInvoiceService(
  id: string,
  clientId: string
): Promise<Invoice | null> {
  const InvoiceModel = await getInvoiceModel()
  const doc = await InvoiceModel.findByIdAndUpdate(id, { clientId }, { new: true })
  return doc ? toApiObject<Invoice>(doc) : null
}

export async function addLineItemToInvoiceService(
  id: string,
  item: AddLineItem
): Promise<Invoice | null> {
  const InvoiceModel = await getInvoiceModel()
  const doc = await InvoiceModel.findByIdAndUpdate(id, { $push: { items: item } }, { new: true })
  return doc ? toApiObject<Invoice>(doc) : null
}

export async function markInvoiceAsPaidService(
  id: string,
  options?: {
    companyId?: string
    paymentDate?: string
    notes?: string
  }
): Promise<{ invoice: Invoice; receipt?: Receipt } | null> {
  const InvoiceModel = await getInvoiceModel()
  // Get the invoice first to check current status
  const invoice = await InvoiceModel.findById(id)
  if (!invoice || invoice.deletedAt) {
    return null
  }

  // Check if receipt already exists for this invoice
  const { getReceiptModel } = await import('../../models/billing/receipt.js')
  const ReceiptModel = await getReceiptModel()
  const existingReceipt = await ReceiptModel.findOne({
    invoiceId: invoice._id.toString(),
    deletedAt: null,
  })

  // Don't create receipt if already paid AND receipt exists (to prevent duplicate receipts)
  if (invoice.status === 'paid' && existingReceipt) {
    return {
      invoice: toApiObject<Invoice>(invoice),
      receipt: toApiObject<Receipt>(existingReceipt),
    }
  }

  // Update invoice status to paid and set paidAt date
  const paidAtDate = options?.paymentDate
    ? new Date(options.paymentDate).toISOString()
    : new Date().toISOString()
  const updatedInvoice = await InvoiceModel.findByIdAndUpdate(
    id,
    { status: 'paid', paidAt: paidAtDate },
    { new: true }
  )

  if (!updatedInvoice) {
    return null
  }

  // Automatically generate a receipt
  try {
    const { generateNextNumber } = await import('../../utils/generate-next-number.js')

    const receiptDocumentNumber = await generateNextNumber('receipt', updatedInvoice.userId)

    // For flat-rate invoices, create a single line item from description
    const receiptItems =
      updatedInvoice.billingType === 'flat-rate'
        ? [
            {
              label: updatedInvoice.description || 'Service',
              quantity: 1,
              price: updatedInvoice.flatRateAmount || updatedInvoice.subtotal,
            },
          ]
        : updatedInvoice.items

    // Prepare receipt data - handle missing exchangeRate by creating default 1:1 rate
    const receiptExchangeRate = updatedInvoice.exchangeRate || {
      from: updatedInvoice.currency,
      to: updatedInvoice.currency,
      rate: 1,
      source: 'default',
      fetchedAt: new Date().toISOString(),
    }

    const receiptData = {
      userId: updatedInvoice.userId,
      companyId: options?.companyId || updatedInvoice.companyId,
      clientId: updatedInvoice.clientId,
      billingType: updatedInvoice.billingType,
      items: receiptItems,
      description: updatedInvoice.description,
      flatRateAmount: updatedInvoice.flatRateAmount,
      currency: updatedInvoice.currency,
      exchangeRate: receiptExchangeRate,
      notes: options?.notes || `Receipt for invoice ${updatedInvoice.documentNumber}`,
      status: 'issued',
      invoiceId: updatedInvoice._id.toString(),
      paymentDate: options?.paymentDate
        ? new Date(options.paymentDate).toISOString()
        : new Date().toISOString(),
      documentNumber: receiptDocumentNumber,
      subtotal: updatedInvoice.subtotal,
      taxAmount: updatedInvoice.taxAmount,
      total: updatedInvoice.total,
    }

    // Reuse the ReceiptModel from above
    const receiptDoc = new ReceiptModel(receiptData)
    const savedReceipt = await receiptDoc.save()

    return {
      invoice: toApiObject<Invoice>(updatedInvoice),
      receipt: toApiObject<Receipt>(savedReceipt),
    }
  } catch (error) {
    logger.error('Failed to create receipt for invoice:', error)
    // Return the invoice even if receipt creation fails
    return { invoice: toApiObject<Invoice>(updatedInvoice) }
  }
}

export async function removeLineItemToInvoiceService(
  id: string,
  itemId: string
): Promise<Invoice | null> {
  const InvoiceModel = await getInvoiceModel()
  const doc = await InvoiceModel.findByIdAndUpdate(
    id,
    { $pull: { items: { _id: itemId } } },
    { new: true }
  )
  return doc ? toApiObject<Invoice>(doc) : null
}
