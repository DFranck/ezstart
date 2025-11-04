/**
 * Generate retroactive invoices and receipts for Coreum crypto payments
 *
 * Run with: node scripts/generate-invoices.js
 */

const API_URL = 'http://localhost:5020/api'
const USER_ID = '68fe026cf237788372bece7b'
const CLIENT_ID = '6909e68813f65ab63afea5fd'
const COMPANY_ID = '6907849380d698daf83f95ad'

// Payment data from crypto transactions
const payments = [
  { date: '2025-09-04', amount: 699, usdc: 700 },
  { date: '2025-09-08', amount: 1119, usdc: 1120 },
  { date: '2025-09-15', amount: 1120, usdc: 1120 },
  { date: '2025-09-24', amount: 1119, usdc: 1120 },
  { date: '2025-10-03', amount: 1120, usdc: 1121 },
  { date: '2025-10-13', amount: 1120, usdc: 1121 },
  { date: '2025-10-21', amount: 1216, usdc: 1217 },
  { date: '2025-10-27', amount: 1312, usdc: 1313 },
  { date: '2025-11-04', amount: 1376, usdc: 1377 },
]

async function callApi(endpoint, options = {}) {
  const { method = 'GET', body } = options

  const headers = {
    'Content-Type': 'application/json',
    'X-User-Id': USER_ID,
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    ...(body && { body: JSON.stringify(body) }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(`API Error: ${JSON.stringify(data)}`)
  }

  return data
}

async function createInvoice(paymentData, index) {
  const invoiceData = {
    userId: USER_ID,
    clientId: CLIENT_ID,
    companyId: COMPANY_ID,
    items: [
      {
        label: 'Services',
        quantity: 1,
        price: paymentData.amount,
      }
    ],
    currency: 'USD',
    status: 'paid',
    notes: `Payment received: ${paymentData.usdc} USDC`,
    taxRate: 0,
  }

  console.log(`\n📄 Creating invoice ${index + 1}/9 for $${paymentData.amount} (${paymentData.date})...`)
  const invoice = await callApi('/invoices', {
    method: 'POST',
    body: invoiceData,
  })

  console.log(`✅ Invoice created: ${invoice.documentNumber}`)
  return invoice
}

async function createReceipt(invoice, paymentData) {
  const receiptData = {
    userId: USER_ID,
    invoiceId: invoice._id,
    clientId: CLIENT_ID,
    companyId: COMPANY_ID,
    items: invoice.items,
    currency: invoice.currency,
    notes: invoice.notes,
    taxRate: invoice.taxRate,
  }

  console.log(`📝 Creating receipt for invoice ${invoice.documentNumber}...`)
  const receipt = await callApi('/receipts', {
    method: 'POST',
    body: receiptData,
  })

  console.log(`✅ Receipt created: ${receipt.documentNumber}`)
  return receipt
}

async function updateDocumentDate(type, id, date) {
  // Update createdAt to match payment date
  console.log(`📅 Updating ${type} date to ${date}...`)

  // Direct MongoDB update would be needed here
  // For now, the documents will have today's date
  // You can manually update in MongoDB if needed:
  // db.invoices.updateOne({_id: ObjectId("...")}, {$set: {createdAt: new Date("2025-09-04")}})
}

async function generateAll() {
  console.log('🚀 Starting invoice generation...')
  console.log(`📊 Total payments: ${payments.length}`)
  console.log(`💰 Total amount: $${payments.reduce((sum, p) => sum + p.amount, 0)}`)

  try {
    for (let i = 0; i < payments.length; i++) {
      const payment = payments[i]

      // Create invoice
      const invoice = await createInvoice(payment, i)

      // Create receipt
      await createReceipt(invoice, payment)

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log('\n✨ Done! All invoices and receipts created successfully!')
    console.log('\n⚠️  Note: Dates are set to today. To set retroactive dates:')
    console.log('   1. Open MongoDB Compass or mongosh')
    console.log('   2. Update createdAt field for each document')
    console.log('\n   Example:')
    console.log('   db.invoices.updateMany(')
    console.log('     {userId: "68fe026cf237788372bece7b"},')
    console.log('     {$set: {createdAt: new Date("2025-09-04")}}')
    console.log('   )')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Run
generateAll()
