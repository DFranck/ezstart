const API_URL = 'https://ezbill-api.ezstart.xyz'
const CLIENT_ID = '6909e7b013f65ab63afea60c'
const USER_ID = '68fe026cf237788372bece7b'

async function checkDates() {
  const response = await fetch(`${API_URL}/api/invoices?clientId=${CLIENT_ID}`, {
    headers: { 'X-User-Id': USER_ID }
  })
  const data = await response.json()
  const invoices = Array.isArray(data) ? data : (data.invoices || [])

  invoices.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))

  console.log('\n📋 Zephyrus Project - Invoices Dates\n')
  console.log('Invoice      | Created    | Due Date   | Updated    | Status | Amount')
  console.log('-------------|------------|------------|------------|--------|--------')

  invoices.forEach(inv => {
    const created = inv.createdAt.split('T')[0]
    const due = inv.dueDate
    const updated = inv.updatedAt.split('T')[0]
    const amount = '$' + inv.total.toFixed(2)

    console.log(`${inv.documentNumber} | ${created} | ${due} | ${updated} | ${inv.status.padEnd(6)} | ${amount}`)
  })

  console.log('\n📊 Date Analysis:')
  console.log('- Created: Date when invoice was created in system')
  console.log('- Due Date: Payment deadline')
  console.log('- Updated: Last modification date')
}

checkDates()
