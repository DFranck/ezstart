/**
 * Script to delete and recreate Zephyrus Project invoices with correct amounts
 *
 * Usage: node scripts/fix-zephyrus-invoices.mjs
 */

const API_URL = 'https://ezbill-api.ezstart.xyz'
const CLIENT_ID = '6909e7b013f65ab63afea60c'
const USER_ID = '68fe026cf237788372bece7b'

// Correct invoice data from timesheet - using API schema (label, price, quantity, currency)
// createdAt = End date of work period, dueDate = +30 days
const INVOICES = [
  {
    status: 'sent',
    createdAt: '2025-03-07', // End of work period
    dueDate: '2025-04-06',   // +30 days
    currency: 'USD',
    items: [{
      label: 'Development work - Feb 25 to Mar 07, 2025 (45 hours @ $17/hour)',
      quantity: 45,
      price: 17
    }],
    notes: 'Period: February 25 - March 07, 2025\nTotal: $765.00'
  },
  {
    status: 'sent',
    createdAt: '2025-03-21',
    dueDate: '2025-04-20',
    currency: 'USD',
    items: [{
      label: 'Development work - Mar 10 to Mar 21, 2025 (43 hours @ $17/hour)',
      quantity: 43,
      price: 17
    }],
    notes: 'Period: March 10 - March 21, 2025\nTotal: $731.00'
  },
  {
    status: 'sent',
    createdAt: '2025-04-01',
    dueDate: '2025-05-01',
    currency: 'USD',
    items: [{
      label: 'Development work - Mar 24 to Apr 01, 2025 (40 hours @ $17/hour)',
      quantity: 40,
      price: 17
    }],
    notes: 'Period: March 24 - April 01, 2025\nTotal: $680.00'
  },
  {
    status: 'sent',
    createdAt: '2025-04-18',
    dueDate: '2025-05-18',
    currency: 'USD',
    items: [{
      label: 'Development work - Apr 11 to Apr 18, 2025 (39 hours @ $17/hour)',
      quantity: 39,
      price: 17
    }],
    notes: 'Period: April 11 - April 18, 2025\nTotal: $663.00'
  },
  {
    status: 'sent',
    createdAt: '2025-04-25',
    dueDate: '2025-05-25',
    currency: 'USD',
    items: [{
      label: 'Development work - Apr 21 to Apr 25, 2025 (34 hours @ $17/hour)',
      quantity: 34,
      price: 17
    }],
    notes: 'Period: April 21 - April 25, 2025\nTotal: $578.00'
  },
  {
    status: 'sent',
    createdAt: '2025-06-27',
    dueDate: '2025-07-27',
    currency: 'USD',
    items: [{
      label: 'Development work - Jun 17 to Jun 27, 2025 (31 hours @ $17/hour)',
      quantity: 31,
      price: 17
    }],
    notes: 'Period: June 17 - June 27, 2025\nTotal: $527.00'
  },
  {
    status: 'sent',
    createdAt: '2025-07-11',
    dueDate: '2025-08-10',
    currency: 'USD',
    items: [{
      label: 'Development work - Jun 30 to Jul 11, 2025 (57 hours @ $17/hour)',
      quantity: 57,
      price: 17
    }],
    notes: 'Period: June 30 - July 11, 2025\nTotal: $969.00'
  },
  {
    status: 'sent',
    createdAt: '2025-07-25',
    dueDate: '2025-08-24',
    currency: 'USD',
    items: [{
      label: 'Development work - Jul 14 to Jul 25, 2025 (46 hours @ $17/hour)',
      quantity: 46,
      price: 17
    }],
    notes: 'Period: July 14 - July 25, 2025\nTotal: $782.00'
  },
  {
    status: 'sent',
    createdAt: '2025-08-08',
    dueDate: '2025-09-07',
    currency: 'USD',
    items: [{
      label: 'Development work - Jul 29 to Aug 08, 2025 (24.5 hours @ $17/hour)',
      quantity: 24.5,
      price: 17
    }],
    notes: 'Period: July 29 - August 08, 2025\nTotal: $416.50'
  },
  {
    status: 'sent',
    createdAt: '2025-08-22',
    dueDate: '2025-09-21',
    currency: 'USD',
    items: [{
      label: 'Development work - Aug 12 to Aug 22, 2025 (31.5 hours @ $17/hour)',
      quantity: 31.5,
      price: 17
    }],
    notes: 'Period: August 12 - August 22, 2025\nTotal: $535.50'
  },
  {
    status: 'sent',
    createdAt: '2025-09-08',
    dueDate: '2025-10-08',
    currency: 'USD',
    items: [{
      label: 'Development work - Aug 25 to Sep 08, 2025 (14.5 hours @ $17/hour)',
      quantity: 14.5,
      price: 17
    }],
    notes: 'Period: August 25 - September 08, 2025\nTotal: $246.50'
  },
  {
    status: 'sent',
    createdAt: '2025-09-29',
    dueDate: '2025-10-29',
    currency: 'USD',
    items: [{
      label: 'Development work - Sep 18 to Sep 29, 2025 (9.5 hours @ $17/hour)',
      quantity: 9.5,
      price: 17
    }],
    notes: 'Period: September 18 - September 29, 2025\nTotal: $161.50'
  }
]

async function deleteAllInvoices() {
  console.log('🗑️  Fetching existing invoices for Zephyrus Project...')

  const response = await fetch(`${API_URL}/api/invoices?clientId=${CLIENT_ID}`)
  const data = await response.json()
  const invoices = Array.isArray(data) ? data : (data.invoices || [])

  console.log(`Found ${invoices.length} invoices to delete`)

  for (const invoice of invoices) {
    console.log(`   Deleting invoice ${invoice.documentNumber || invoice._id}...`)
    const deleteResponse = await fetch(`${API_URL}/api/invoices/${invoice._id}`, {
      method: 'DELETE',
      headers: {
        'X-User-Id': USER_ID
      }
    })

    if (!deleteResponse.ok) {
      console.error(`   ❌ Failed to delete invoice ${invoice.documentNumber || invoice._id}`)
    } else {
      console.log(`   ✅ Deleted invoice ${invoice.documentNumber || invoice._id}`)
    }
  }

  console.log('✅ All invoices deleted\n')
}

async function createInvoices() {
  console.log('📝 Creating 12 new invoices with correct amounts...\n')

  let totalHours = 0
  let totalAmount = 0

  for (let i = 0; i < INVOICES.length; i++) {
    const invoice = INVOICES[i]
    const invoiceNumber = i + 1
    const hours = invoice.items[0].quantity
    const amount = hours * invoice.items[0].price

    totalHours += hours
    totalAmount += amount

    console.log(`Creating invoice ${invoiceNumber}/12 - ${hours}h × $${invoice.items[0].price} = $${amount}...`)

    const response = await fetch(`${API_URL}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': USER_ID
      },
      body: JSON.stringify({
        userId: USER_ID,
        clientId: CLIENT_ID,
        ...invoice
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error(`❌ Failed to create invoice ${invoiceNumber}:`, error)
    } else {
      const created = await response.json()
      console.log(`✅ Created ${created.documentNumber} - $${amount}`)
    }
  }

  console.log(`\n✅ All 12 invoices created successfully!`)
  console.log(`\n💰 Total invoiced: $${totalAmount.toFixed(2)}`)
  console.log(`📊 Total hours: ${totalHours}h`)
  console.log(`⏱️  Average rate: $${(totalAmount / totalHours).toFixed(2)}/hour`)
}

async function main() {
  try {
    console.log('🚀 Starting Zephyrus invoices fix...\n')

    await deleteAllInvoices()
    await createInvoices()

    console.log('\n✨ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
