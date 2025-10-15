/**
 * Comprehensive test script for all EZBill item types
 * Tests: Create → Soft Delete → Verify in deleted list → Restore → Hard Delete
 */

const EZAUTH_API = 'http://localhost:5010/api/auth'
const EZBILL_API = 'http://localhost:5020/api'

interface AuthCodeResponse {
  success: boolean
  code: string
  expires_at: string
  message: string
}

interface TokenResponse {
  success: boolean
  access_token: string
  token_type: string
  expires_in: number
}

// Test results tracking
interface TestResult {
  name: string
  create: boolean
  softDelete: boolean
  appearsInDeleted: boolean
  restore: boolean
  hardDelete: boolean
}

const results: TestResult[] = []

async function loginTestUser() {
  console.log('🔐 Logging in test user...')
  const loginResponse = await fetch(`${EZAUTH_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@ezbill.local',
      password: 'TestPassword123!',
      app: 'ezbill',
    }),
  })

  if (!loginResponse.ok) {
    throw new Error(`Login failed: ${await loginResponse.text()}`)
  }

  const loginData: AuthCodeResponse = await loginResponse.json()

  // Exchange code for token
  const tokenResponse = await fetch(`${EZAUTH_API}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: loginData.code,
      app: 'ezbill',
    }),
  })

  if (!tokenResponse.ok) {
    throw new Error(`Token exchange failed: ${await tokenResponse.text()}`)
  }

  const tokenData: TokenResponse = await tokenResponse.json()

  // Get user info
  const meResponse = await fetch(`${EZAUTH_API}/me`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })

  const meData = await meResponse.json()
  console.log(`✅ Logged in as: ${meData.user.email} (${meData.user._id})\n`)

  return meData.user._id
}

async function testClient(userId: string) {
  const result: TestResult = {
    name: 'Client',
    create: false,
    softDelete: false,
    appearsInDeleted: false,
    restore: false,
    hardDelete: false,
  }

  try {
    console.log('📋 Testing Client...')

    // 1. Create
    console.log('  1️⃣ Creating client...')
    const createRes = await fetch(`${EZBILL_API}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        clientName: 'Test Client Corp',
        email: 'client@test.com',
        phone: '+1234567890',
        address: '123 Test St',
        isCompany: true,
      }),
    })

    if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`)
    const client = await createRes.json()
    result.create = true
    console.log(`     ✅ Created: ${client.clientName} (${client._id})`)

    // 2. Soft Delete
    console.log('  2️⃣ Soft deleting...')
    const deleteRes = await fetch(`${EZBILL_API}/clients/${client._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!deleteRes.ok) throw new Error(`Soft delete failed: ${await deleteRes.text()}`)
    const deleted = await deleteRes.json()
    result.softDelete = !!deleted.deletedAt
    console.log(`     ✅ Soft deleted at: ${deleted.deletedAt}`)

    // 3. Check appears in deleted list
    console.log('  3️⃣ Checking deleted list...')
    const deletedListRes = await fetch(`${EZBILL_API}/clients?deletedOnly=true`, {
      headers: { 'x-user-id': userId },
    })

    const deletedList = await deletedListRes.json()
    const found = deletedList.find((c: any) => c._id === client._id)
    result.appearsInDeleted = !!found
    console.log(`     ${found ? '✅' : '❌'} Found in deleted list`)

    // 4. Restore
    console.log('  4️⃣ Restoring...')
    const restoreRes = await fetch(`${EZBILL_API}/clients/${client._id}/restore`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    })

    if (!restoreRes.ok) throw new Error(`Restore failed: ${await restoreRes.text()}`)
    const restored = await restoreRes.json()
    result.restore = !restored.deletedAt
    console.log(`     ✅ Restored (deletedAt: ${restored.deletedAt || 'null'})`)

    // 5. Hard Delete
    console.log('  5️⃣ Hard deleting...')
    const hardDeleteRes = await fetch(`${EZBILL_API}/clients/${client._id}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!hardDeleteRes.ok) throw new Error(`Hard delete failed: ${await hardDeleteRes.text()}`)
    result.hardDelete = true
    console.log(`     ✅ Permanently deleted\n`)
  } catch (error) {
    console.error(`  ❌ Error: ${error}\n`)
  }

  results.push(result)
}

async function testCompany(userId: string) {
  const result: TestResult = {
    name: 'Company',
    create: false,
    softDelete: false,
    appearsInDeleted: false,
    restore: false,
    hardDelete: false,
  }

  try {
    console.log('🏢 Testing Company...')

    // 1. Create
    console.log('  1️⃣ Creating company...')
    const createRes = await fetch(`${EZBILL_API}/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        companyName: 'Test Company Inc',
        email: 'company@test.com',
        phone: '+1234567890',
        address: '456 Business Ave',
      }),
    })

    if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`)
    const company = await createRes.json()
    result.create = true
    console.log(`     ✅ Created: ${company.companyName} (${company._id})`)

    // 2. Soft Delete
    console.log('  2️⃣ Soft deleting...')
    const deleteRes = await fetch(`${EZBILL_API}/companies/${company._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!deleteRes.ok) throw new Error(`Soft delete failed: ${await deleteRes.text()}`)
    const deleted = await deleteRes.json()
    result.softDelete = !!deleted.deletedAt
    console.log(`     ✅ Soft deleted at: ${deleted.deletedAt}`)

    // 3. Check appears in deleted list
    console.log('  3️⃣ Checking deleted list...')
    const deletedListRes = await fetch(`${EZBILL_API}/companies?deletedOnly=true`, {
      headers: { 'x-user-id': userId },
    })

    const deletedList = await deletedListRes.json()
    const found = deletedList.find((c: any) => c._id === company._id)
    result.appearsInDeleted = !!found
    console.log(`     ${found ? '✅' : '❌'} Found in deleted list`)

    // 4. Restore
    console.log('  4️⃣ Restoring...')
    const restoreRes = await fetch(`${EZBILL_API}/companies/${company._id}/restore`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    })

    if (!restoreRes.ok) throw new Error(`Restore failed: ${await restoreRes.text()}`)
    const restored = await restoreRes.json()
    result.restore = !restored.deletedAt
    console.log(`     ✅ Restored (deletedAt: ${restored.deletedAt || 'null'})`)

    // 5. Hard Delete
    console.log('  5️⃣ Hard deleting...')
    const hardDeleteRes = await fetch(`${EZBILL_API}/companies/${company._id}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!hardDeleteRes.ok) throw new Error(`Hard delete failed: ${await hardDeleteRes.text()}`)
    result.hardDelete = true
    console.log(`     ✅ Permanently deleted\n`)
  } catch (error) {
    console.error(`  ❌ Error: ${error}\n`)
  }

  results.push(result)
}

async function testPaymentMethod(userId: string) {
  const result: TestResult = {
    name: 'Payment Method',
    create: false,
    softDelete: false,
    appearsInDeleted: false,
    restore: false,
    hardDelete: false,
  }

  try {
    console.log('💳 Testing Payment Method...')

    // 1. Create
    console.log('  1️⃣ Creating payment method...')
    const createRes = await fetch(`${EZBILL_API}/payment-methods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        name: 'Test Bank Account',
        type: 'bank_transfer',
        accountNumber: '987654321',
        bankName: 'Test Bank',
        isDefault: false,
      }),
    })

    if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`)
    const pm = await createRes.json()
    result.create = true
    console.log(`     ✅ Created: ${pm.name} (${pm._id})`)

    // 2. Soft Delete
    console.log('  2️⃣ Soft deleting...')
    const deleteRes = await fetch(`${EZBILL_API}/payment-methods/${pm._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!deleteRes.ok) throw new Error(`Soft delete failed: ${await deleteRes.text()}`)
    const deleted = await deleteRes.json()
    result.softDelete = !!deleted.deletedAt
    console.log(`     ✅ Soft deleted at: ${deleted.deletedAt}`)

    // 3. Check appears in deleted list
    console.log('  3️⃣ Checking deleted list...')
    const deletedListRes = await fetch(`${EZBILL_API}/payment-methods?deletedOnly=true`, {
      headers: { 'x-user-id': userId },
    })

    const deletedList = await deletedListRes.json()
    const found = deletedList.find((p: any) => p._id === pm._id)
    result.appearsInDeleted = !!found
    console.log(`     ${found ? '✅' : '❌'} Found in deleted list`)

    // 4. Restore
    console.log('  4️⃣ Restoring...')
    const restoreRes = await fetch(`${EZBILL_API}/payment-methods/${pm._id}/restore`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    })

    if (!restoreRes.ok) throw new Error(`Restore failed: ${await restoreRes.text()}`)
    const restored = await restoreRes.json()
    result.restore = !restored.deletedAt
    console.log(`     ✅ Restored (deletedAt: ${restored.deletedAt || 'null'})`)

    // 5. Hard Delete
    console.log('  5️⃣ Hard deleting...')
    const hardDeleteRes = await fetch(`${EZBILL_API}/payment-methods/${pm._id}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!hardDeleteRes.ok) throw new Error(`Hard delete failed: ${await hardDeleteRes.text()}`)
    result.hardDelete = true
    console.log(`     ✅ Permanently deleted\n`)
  } catch (error) {
    console.error(`  ❌ Error: ${error}\n`)
  }

  results.push(result)
}

async function testQuote(userId: string, clientId: string) {
  const result: TestResult = {
    name: 'Quote',
    create: false,
    softDelete: false,
    appearsInDeleted: false,
    restore: false,
    hardDelete: false,
  }

  try {
    console.log('📄 Testing Quote...')

    // 1. Create
    console.log('  1️⃣ Creating quote...')
    const createRes = await fetch(`${EZBILL_API}/quotes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        clientId,
        items: [
          {
            label: 'Test Service',
            quantity: 1,
            price: 100,
          },
        ],
        currency: 'USD',
        status: 'draft',
      }),
    })

    if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`)
    const quote = await createRes.json()
    result.create = true
    console.log(`     ✅ Created: ${quote.documentNumber} (${quote._id})`)

    // 2. Soft Delete
    console.log('  2️⃣ Soft deleting...')
    const deleteRes = await fetch(`${EZBILL_API}/quotes/${quote._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!deleteRes.ok) throw new Error(`Soft delete failed: ${await deleteRes.text()}`)
    const deleted = await deleteRes.json()
    result.softDelete = !!deleted.deletedAt
    console.log(`     ✅ Soft deleted at: ${deleted.deletedAt}`)

    // 3. Check appears in deleted list
    console.log('  3️⃣ Checking deleted list...')
    const deletedListRes = await fetch(`${EZBILL_API}/quotes?deletedOnly=true`, {
      headers: { 'x-user-id': userId },
    })

    const deletedList = await deletedListRes.json()
    const found = deletedList.find((q: any) => q._id === quote._id)
    result.appearsInDeleted = !!found
    console.log(`     ${found ? '✅' : '❌'} Found in deleted list`)

    // 4. Restore
    console.log('  4️⃣ Restoring...')
    const restoreRes = await fetch(`${EZBILL_API}/quotes/${quote._id}/restore`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    })

    if (!restoreRes.ok) throw new Error(`Restore failed: ${await restoreRes.text()}`)
    const restored = await restoreRes.json()
    result.restore = !restored.deletedAt
    console.log(`     ✅ Restored (deletedAt: ${restored.deletedAt || 'null'})`)

    // 5. Hard Delete
    console.log('  5️⃣ Hard deleting...')
    const hardDeleteRes = await fetch(`${EZBILL_API}/quotes/${quote._id}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!hardDeleteRes.ok) throw new Error(`Hard delete failed: ${await hardDeleteRes.text()}`)
    result.hardDelete = true
    console.log(`     ✅ Permanently deleted\n`)
  } catch (error) {
    console.error(`  ❌ Error: ${error}\n`)
  }

  results.push(result)
}

async function testInvoice(userId: string, clientId: string) {
  const result: TestResult = {
    name: 'Invoice',
    create: false,
    softDelete: false,
    appearsInDeleted: false,
    restore: false,
    hardDelete: false,
  }

  try {
    console.log('🧾 Testing Invoice...')

    // 1. Create
    console.log('  1️⃣ Creating invoice...')
    const createRes = await fetch(`${EZBILL_API}/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        clientId,
        items: [
          {
            label: 'Test Product',
            quantity: 2,
            price: 50,
          },
        ],
        currency: 'USD',
        status: 'draft',
      }),
    })

    if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`)
    const invoice = await createRes.json()
    result.create = true
    console.log(`     ✅ Created: ${invoice.documentNumber} (${invoice._id})`)

    // 2. Soft Delete
    console.log('  2️⃣ Soft deleting...')
    const deleteRes = await fetch(`${EZBILL_API}/invoices/${invoice._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!deleteRes.ok) throw new Error(`Soft delete failed: ${await deleteRes.text()}`)
    const deleted = await deleteRes.json()
    result.softDelete = !!deleted.deletedAt
    console.log(`     ✅ Soft deleted at: ${deleted.deletedAt}`)

    // 3. Check appears in deleted list
    console.log('  3️⃣ Checking deleted list...')
    const deletedListRes = await fetch(`${EZBILL_API}/invoices?deletedOnly=true`, {
      headers: { 'x-user-id': userId },
    })

    const deletedList = await deletedListRes.json()
    const found = deletedList.find((i: any) => i._id === invoice._id)
    result.appearsInDeleted = !!found
    console.log(`     ${found ? '✅' : '❌'} Found in deleted list`)

    // 4. Restore
    console.log('  4️⃣ Restoring...')
    const restoreRes = await fetch(`${EZBILL_API}/invoices/${invoice._id}/restore`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    })

    if (!restoreRes.ok) throw new Error(`Restore failed: ${await restoreRes.text()}`)
    const restored = await restoreRes.json()
    result.restore = !restored.deletedAt
    console.log(`     ✅ Restored (deletedAt: ${restored.deletedAt || 'null'})`)

    // 5. Hard Delete
    console.log('  5️⃣ Hard deleting...')
    const hardDeleteRes = await fetch(`${EZBILL_API}/invoices/${invoice._id}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!hardDeleteRes.ok) throw new Error(`Hard delete failed: ${await hardDeleteRes.text()}`)
    result.hardDelete = true
    console.log(`     ✅ Permanently deleted\n`)
  } catch (error) {
    console.error(`  ❌ Error: ${error}\n`)
  }

  results.push(result)
}

async function testReceipt(userId: string, clientId: string) {
  const result: TestResult = {
    name: 'Receipt',
    create: false,
    softDelete: false,
    appearsInDeleted: false,
    restore: false,
    hardDelete: false,
  }

  try {
    console.log('🧾 Testing Receipt...')

    // 1. Create
    console.log('  1️⃣ Creating receipt...')
    const createRes = await fetch(`${EZBILL_API}/receipts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        clientId,
        items: [
          {
            label: 'Payment received',
            quantity: 1,
            price: 110,
          },
        ],
        currency: 'USD',
        status: 'paid',
      }),
    })

    if (!createRes.ok) throw new Error(`Create failed: ${await createRes.text()}`)
    const receipt = await createRes.json()
    result.create = true
    console.log(`     ✅ Created: ${receipt.documentNumber} (${receipt._id})`)

    // 2. Soft Delete
    console.log('  2️⃣ Soft deleting...')
    const deleteRes = await fetch(`${EZBILL_API}/receipts/${receipt._id}`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!deleteRes.ok) throw new Error(`Soft delete failed: ${await deleteRes.text()}`)
    const deleted = await deleteRes.json()
    result.softDelete = !!deleted.deletedAt
    console.log(`     ✅ Soft deleted at: ${deleted.deletedAt}`)

    // 3. Check appears in deleted list
    console.log('  3️⃣ Checking deleted list...')
    const deletedListRes = await fetch(`${EZBILL_API}/receipts?deletedOnly=true`, {
      headers: { 'x-user-id': userId },
    })

    const deletedList = await deletedListRes.json()
    const found = deletedList.find((r: any) => r._id === receipt._id)
    result.appearsInDeleted = !!found
    console.log(`     ${found ? '✅' : '❌'} Found in deleted list`)

    // 4. Restore
    console.log('  4️⃣ Restoring...')
    const restoreRes = await fetch(`${EZBILL_API}/receipts/${receipt._id}/restore`, {
      method: 'POST',
      headers: { 'x-user-id': userId },
    })

    if (!restoreRes.ok) throw new Error(`Restore failed: ${await restoreRes.text()}`)
    const restored = await restoreRes.json()
    result.restore = !restored.deletedAt
    console.log(`     ✅ Restored (deletedAt: ${restored.deletedAt || 'null'})`)

    // 5. Hard Delete
    console.log('  5️⃣ Hard deleting...')
    const hardDeleteRes = await fetch(`${EZBILL_API}/receipts/${receipt._id}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })

    if (!hardDeleteRes.ok) throw new Error(`Hard delete failed: ${await hardDeleteRes.text()}`)
    result.hardDelete = true
    console.log(`     ✅ Permanently deleted\n`)
  } catch (error) {
    console.error(`  ❌ Error: ${error}\n`)
  }

  results.push(result)
}

function printSummary() {
  console.log('═'.repeat(80))
  console.log('📊 TEST SUMMARY')
  console.log('═'.repeat(80))
  console.log()

  const headers = ['Item Type', 'Create', 'Soft Del', 'In List', 'Restore', 'Hard Del', 'Status']
  const colWidths = [20, 8, 8, 8, 8, 8, 8]

  // Print header
  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ')
  console.log(headerLine)
  console.log('-'.repeat(headerLine.length))

  // Print results
  results.forEach(result => {
    const allPassed =
      result.create &&
      result.softDelete &&
      result.appearsInDeleted &&
      result.restore &&
      result.hardDelete

    const row = [
      result.name.padEnd(colWidths[0]),
      (result.create ? '✅' : '❌').padEnd(colWidths[1]),
      (result.softDelete ? '✅' : '❌').padEnd(colWidths[2]),
      (result.appearsInDeleted ? '✅' : '❌').padEnd(colWidths[3]),
      (result.restore ? '✅' : '❌').padEnd(colWidths[4]),
      (result.hardDelete ? '✅' : '❌').padEnd(colWidths[5]),
      (allPassed ? '🎉 PASS' : '❌ FAIL').padEnd(colWidths[6]),
    ].join(' | ')

    console.log(row)
  })

  console.log()

  // Overall summary
  const totalTests = results.length
  const passedTests = results.filter(
    r => r.create && r.softDelete && r.appearsInDeleted && r.restore && r.hardDelete
  ).length

  console.log(`Total: ${passedTests}/${totalTests} passed`)
  console.log()

  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! 🎉')
  } else {
    console.log('❌ Some tests failed. Check details above.')
  }

  console.log('═'.repeat(80))
}

// Main execution
;(async () => {
  try {
    console.log('🧪 EZBill - Comprehensive Item Testing')
    console.log('═'.repeat(80))
    console.log()

    const userId = await loginTestUser()

    // Create a temporary client for documents testing
    console.log('📋 Creating temporary client for documents...')
    const clientRes = await fetch(`${EZBILL_API}/clients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      body: JSON.stringify({
        clientName: 'Temp Client for Docs',
        email: 'temp@test.com',
        isCompany: false,
      }),
    })
    const tempClient = await clientRes.json()
    console.log(`✅ Created temp client: ${tempClient._id}\n`)

    console.log('─'.repeat(80))
    console.log()

    // Run all tests
    await testClient(userId)
    await testCompany(userId)
    await testPaymentMethod(userId)
    await testQuote(userId, tempClient._id)
    await testInvoice(userId, tempClient._id)
    await testReceipt(userId, tempClient._id)

    // Cleanup temp client
    console.log('🧹 Cleaning up temp client...')
    await fetch(`${EZBILL_API}/clients/${tempClient._id}?permanent=true`, {
      method: 'DELETE',
      headers: { 'x-user-id': userId },
    })
    console.log('✅ Temp client deleted\n')

    console.log('─'.repeat(80))
    console.log()

    // Print summary
    printSummary()
  } catch (error) {
    console.error('❌ Test execution failed:', error)
    process.exit(1)
  }
})()
