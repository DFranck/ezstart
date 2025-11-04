/**
 * Update invoice and receipt dates to match actual payment dates
 *
 * Run with MongoDB connection:
 * mongosh "mongodb://localhost:27017/ezbill" update-invoice-dates.js
 */

const userId = '68fe026cf237788372bece7b'

// Map invoice numbers to their actual payment dates
const invoiceDates = {
  'INV-2025-0001': '2025-09-04',
  'INV-2025-0002': '2025-09-08',
  'INV-2025-0003': '2025-09-15',
  'INV-2025-0004': '2025-09-24',
  'INV-2025-0005': '2025-10-03',
  'INV-2025-0006': '2025-10-13',
  'INV-2025-0007': '2025-10-21',
  'INV-2025-0008': '2025-10-27',
  'INV-2025-0009': '2025-11-04',
}

const receiptDates = {
  'R-2025-0001': '2025-09-04',
  'R-2025-0002': '2025-09-08',
  'R-2025-0003': '2025-09-15',
  'R-2025-0004': '2025-09-24',
  'R-2025-0005': '2025-10-03',
  'R-2025-0006': '2025-10-13',
  'R-2025-0007': '2025-10-21',
  'R-2025-0008': '2025-10-27',
  'R-2025-0009': '2025-11-04',
}

print('🔄 Updating invoice dates...')

// Update invoices
for (const [invoiceNumber, date] of Object.entries(invoiceDates)) {
  const result = db.invoices.updateOne(
    { userId: userId, documentNumber: invoiceNumber },
    { $set: { createdAt: new Date(date), updatedAt: new Date(date) } }
  )
  print(`✅ Updated ${invoiceNumber} to ${date} (matched: ${result.matchedCount})`)
}

print('\n🔄 Updating receipt dates...')

// Update receipts
for (const [receiptNumber, date] of Object.entries(receiptDates)) {
  const result = db.receipts.updateOne(
    { userId: userId, documentNumber: receiptNumber },
    { $set: { createdAt: new Date(date), updatedAt: new Date(date) } }
  )
  print(`✅ Updated ${receiptNumber} to ${date} (matched: ${result.matchedCount})`)
}

print('\n✨ Done! All dates updated.')

// Verify
print('\n📊 Verification:')
const invoices = db.invoices.find({ userId: userId }).sort({ createdAt: 1 }).toArray()
invoices.forEach(inv => {
  print(`${inv.documentNumber}: ${inv.createdAt.toISOString().split('T')[0]} - $${inv.total}`)
})
