/**
 * Script pour vérifier ce qui reste dans la DB EZBill
 *
 * USAGE:
 *   cd apps/ezbill/api
 *   tsx scripts/check-remaining-data.ts
 */

import { connectToMongo } from '@ezstart/express-core'
import { getClientModel } from '../src/models/client.js'
import { getInvoiceModel } from '../src/models/billing/invoice.js'
import { getQuoteModel } from '../src/models/billing/quote.js'
import { getReceiptModel } from '../src/models/billing/receipt.js'
import { getCompanyModel } from '../src/models/company.js'

async function checkRemainingData() {
  console.log('🔍 Connecting to MongoDB...')
  await connectToMongo('ezbilling')

  const Client = await getClientModel()
  const Invoice = await getInvoiceModel()
  const Quote = await getQuoteModel()
  const Receipt = await getReceiptModel()
  const Company = await getCompanyModel()

  console.log('\n📊 DATABASE INVENTORY:\n')

  // Companies
  const companies = await Company.find({})
  console.log(`✅ Companies: ${companies.length}`)
  companies.forEach((c) => {
    console.log(`   - ${c.companyName} (userId: ${c.userId})`)
  })

  // Clients
  const clients = await Client.find({})
  console.log(`\n📋 Clients: ${clients.length}`)
  if (clients.length > 0) {
    clients.forEach((c) => {
      console.log(`   - ${c.clientName} (userId: ${c.userId})`)
    })
  } else {
    console.log('   ❌ No clients found')
  }

  // Invoices
  const invoices = await Invoice.find({})
  console.log(`\n🧾 Invoices: ${invoices.length}`)
  if (invoices.length > 0) {
    invoices.forEach((i) => {
      console.log(`   - ${i.invoiceNumber} (${i.status})`)
    })
  } else {
    console.log('   ❌ No invoices found')
  }

  // Quotes
  const quotes = await Quote.find({})
  console.log(`\n💰 Quotes: ${quotes.length}`)
  if (quotes.length > 0) {
    quotes.forEach((q) => {
      console.log(`   - ${q.quoteNumber} (${q.status})`)
    })
  } else {
    console.log('   ❌ No quotes found')
  }

  // Receipts
  const receipts = await Receipt.find({})
  console.log(`\n🧾 Receipts: ${receipts.length}`)
  if (receipts.length > 0) {
    receipts.forEach((r) => {
      console.log(`   - ${r.receiptNumber}`)
    })
  } else {
    console.log('   ❌ No receipts found')
  }

  console.log('\n✅ Inventory complete.')
  process.exit(0)
}

checkRemainingData().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
