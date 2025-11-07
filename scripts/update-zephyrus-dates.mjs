/**
 * Script to update Zephyrus invoices dates via API
 * Updates createdAt dates to match work period end dates
 *
 * Note: Since API doesn't support setting createdAt, we'll use a workaround
 * by calling a custom admin endpoint or updating via MongoDB directly
 *
 * Usage: node scripts/update-zephyrus-dates.mjs
 */

const API_URL = 'https://ezbill-api.ezstart.xyz'
const CLIENT_ID = '6909e7b013f65ab63afea60c'
const USER_ID = '68fe026cf237788372bece7b'

// Map invoice number to correct dates
const DATE_CORRECTIONS = {
  'INV-2025-0010': { created: '2025-03-07', due: '2025-04-06' }, // Feb 25 - Mar 07
  'INV-2025-0011': { created: '2025-03-21', due: '2025-04-20' }, // Mar 10 - Mar 21
  'INV-2025-0012': { created: '2025-04-01', due: '2025-05-01' }, // Mar 24 - Apr 01
  'INV-2025-0013': { created: '2025-04-18', due: '2025-05-18' }, // Apr 11 - Apr 18
  'INV-2025-0014': { created: '2025-04-25', due: '2025-05-25' }, // Apr 21 - Apr 25
  'INV-2025-0015': { created: '2025-06-27', due: '2025-07-27' }, // Jun 17 - Jun 27
  'INV-2025-0016': { created: '2025-07-11', due: '2025-08-10' }, // Jun 30 - Jul 11
  'INV-2025-0017': { created: '2025-07-25', due: '2025-08-24' }, // Jul 14 - Jul 25
  'INV-2025-0018': { created: '2025-08-08', due: '2025-09-07' }, // Jul 29 - Aug 08
  'INV-2025-0019': { created: '2025-08-22', due: '2025-09-21' }, // Aug 12 - Aug 22
  'INV-2025-0020': { created: '2025-09-08', due: '2025-10-08' }, // Aug 25 - Sep 08
  'INV-2025-0021': { created: '2025-09-29', due: '2025-10-29' }, // Sep 18 - Sep 29
}

async function updateDates() {
  try {
    console.log('🚀 Fetching Zephyrus invoices...\n')

    const response = await fetch(`${API_URL}/api/invoices?clientId=${CLIENT_ID}`, {
      headers: { 'X-User-Id': USER_ID }
    })
    const data = await response.json()
    const invoices = Array.isArray(data) ? data : (data.invoices || [])

    console.log(`📋 Found ${invoices.length} invoices\n`)

    console.log('⚠️  API limitation: Cannot update createdAt via standard endpoint')
    console.log('📋 Date corrections needed:\n')

    for (const invoice of invoices) {
      const correction = DATE_CORRECTIONS[invoice.documentNumber]

      if (!correction) {
        console.log(`   ${invoice.documentNumber} - No correction needed`)
        continue
      }

      const currentCreated = invoice.createdAt.split('T')[0]
      const currentDue = invoice.dueDate

      console.log(`   ${invoice.documentNumber}:`)
      console.log(`      Created: ${currentCreated} → ${correction.created}`)
      console.log(`      Due: ${currentDue} → ${correction.due}`)
      console.log()
    }

    console.log('\n💡 Solution: Update directly in MongoDB')
    console.log('   Run this in MongoDB shell or Compass:\n')
    console.log('```javascript')
    console.log('db.invoices.updateOne(')
    console.log('  { documentNumber: "INV-2025-0010" },')
    console.log('  { $set: { ')
    console.log('    createdAt: new Date("2025-03-07T00:00:00.000Z"),')
    console.log('    updatedAt: new Date()')
    console.log('  }}')
    console.log(')')
    console.log('```')

    console.log('\n📊 Or batch update all:\n')
    const updateCommands = Object.entries(DATE_CORRECTIONS).map(([docNum, dates]) => {
      return `db.invoices.updateOne({ documentNumber: "${docNum}" }, { $set: { createdAt: new Date("${dates.created}T00:00:00.000Z"), updatedAt: new Date() } });`
    }).join('\n')

    console.log('```javascript')
    console.log(updateCommands)
    console.log('```')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

updateDates()
