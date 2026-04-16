/**
 * Migration script to generate missing receipts for paid invoices
 * Run this script to backfill receipts for invoices that were marked as paid
 * before the automatic receipt generation feature was implemented.
 */

import { connectToMongo } from '@ezstart/api-core'
import { getInvoiceModel } from '../models/billing/invoice.js'
import { getReceiptModel } from '../models/billing/receipt.js'
import { generateNextNumber } from '../utils/generate-next-number.js'

async function generateMissingReceipts() {
  try {
    console.log('🔄 Starting receipt generation for paid invoices...\n')

    // Connect to MongoDB
    await connectToMongo('ezbill')
    console.log('✅ Connected to MongoDB\n')

    // Get models
    const InvoiceModel = await getInvoiceModel()
    const ReceiptModel = await getReceiptModel()

    // Find all paid invoices
    const paidInvoices = await InvoiceModel.find({
      status: 'paid',
      deletedAt: null,
    }).sort({ paidAt: 1 }) // Sort by payment date (oldest first)

    console.log(`📊 Found ${paidInvoices.length} paid invoices\n`)

    let receiptsCreated = 0
    let receiptsSkipped = 0

    // Process each invoice
    for (const invoice of paidInvoices) {
      // Check if receipt already exists
      const existingReceipt = await ReceiptModel.findOne({
        invoiceId: invoice._id.toString(),
        deletedAt: null,
      })

      if (existingReceipt) {
        console.log(
          `⏭️  Invoice ${invoice.documentNumber} already has receipt ${existingReceipt.documentNumber}`
        )
        receiptsSkipped++
        continue
      }

      // Generate receipt
      try {
        const receiptDocumentNumber = await generateNextNumber('receipt', invoice.userId)
        const receiptData = {
          userId: invoice.userId,
          companyId: invoice.companyId,
          clientId: invoice.clientId,
          items: invoice.items,
          currency: invoice.currency,
          exchangeRate: invoice.exchangeRate,
          notes: `Receipt for invoice ${invoice.documentNumber}`,
          status: 'issued',
          invoiceId: invoice._id.toString(),
          paymentDate: invoice.paidAt || invoice.updatedAt || invoice.createdAt,
          documentNumber: receiptDocumentNumber,
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          billingType: invoice.billingType,
          description: invoice.description,
          flatRateAmount: invoice.flatRateAmount,
        }

        const receiptDoc = new ReceiptModel(receiptData)
        const savedReceipt = await receiptDoc.save()

        console.log(
          `✅ Created receipt ${savedReceipt.documentNumber} for invoice ${invoice.documentNumber}`
        )
        receiptsCreated++
      } catch (error) {
        console.error(`❌ Failed to create receipt for invoice ${invoice.documentNumber}:`, error)
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   Total paid invoices: ${paidInvoices.length}`)
    console.log(`   Receipts created: ${receiptsCreated}`)
    console.log(`   Receipts skipped (already exist): ${receiptsSkipped}`)
    console.log('\n✅ Migration completed!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
generateMissingReceipts()
