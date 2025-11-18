// Test complete flow: AI extraction → Create Quote in EZBill
// Requires: authenticated user with valid token

async function testFullFlow() {
  console.log('🧪 Testing complete AI → Quote creation flow\n')

  // Step 1: Login to get auth token
  console.log('1️⃣  Logging in...')
  const loginResponse = await fetch('http://localhost:5010/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@test.test',
      password: 'test123!'
    })
  })

  if (!loginResponse.ok) {
    console.log('❌ Login failed:', loginResponse.status)
    return
  }

  // Extract cookies from response
  const cookies = loginResponse.headers.get('set-cookie') || ''
  const authCookie = cookies.split(';').find(c => c.trim().startsWith('authToken='))

  if (!authCookie) {
    console.log('❌ No auth token in response')
    return
  }

  console.log('✅ Logged in successfully\n')

  // Step 2: Get or create a client
  console.log('2️⃣  Getting clients...')
  const clientsResponse = await fetch('http://localhost:5020/api/clients?limit=1', {
    headers: { 'Cookie': authCookie }
  })

  const clientsData = await clientsResponse.json()

  if (!clientsData.clients || clientsData.clients.length === 0) {
    console.log('❌ No clients found. Please create a client first.')
    return
  }

  const client = clientsData.clients[0]
  console.log(`✅ Using client: ${client.name} (${client._id})\n`)

  // Step 3: Extract invoice data with AI
  console.log('3️⃣  Extracting data with AI...')
  const aiText = 'Quote for TechCorp: 3 hours consulting at 150€/h, 2 software licenses at 500€ each, tax rate 20%, due in 30 days'
  console.log(`   Input: "${aiText}"`)

  const aiResponse = await fetch('http://localhost:5020/api/ai/extract-invoice-data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify({ text: aiText })
  })

  const aiData = await aiResponse.json()

  if (!aiData.success) {
    console.log('❌ AI extraction failed:', aiData.error)
    return
  }

  console.log('✅ AI extracted:', JSON.stringify(aiData.data, null, 2))

  // Step 4: Transform AI data to Quote format
  console.log('\n4️⃣  Transforming to Quote format...')

  // Calculate due date (30 days from now)
  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + 30)
  const dueDateISO = dueDate.toISOString().split('T')[0]

  const quoteData = {
    clientId: client._id,
    billingType: 'itemized',
    items: aiData.data.items || [],
    currency: aiData.data.currency || 'EUR',
    taxRate: aiData.data.taxRate || 0,
    dueDate: dueDateISO,
    notes: `Generated from AI: "${aiText}"`,
    status: 'draft'
  }

  console.log('✅ Quote data:', JSON.stringify(quoteData, null, 2))

  // Step 5: Create Quote via API
  console.log('\n5️⃣  Creating Quote...')
  const createQuoteResponse = await fetch('http://localhost:5020/api/quotes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie
    },
    body: JSON.stringify(quoteData)
  })

  if (!createQuoteResponse.ok) {
    const errorData = await createQuoteResponse.json()
    console.log('❌ Failed to create quote:', createQuoteResponse.status)
    console.log('Error:', JSON.stringify(errorData, null, 2))
    return
  }

  const createdQuote = await createQuoteResponse.json()
  console.log('✅ Quote created successfully!')
  console.log('   Quote ID:', createdQuote._id)
  console.log('   Number:', createdQuote.number)
  console.log('   Total (HT):', createdQuote.total, createdQuote.currency)
  console.log('   Tax:', createdQuote.taxAmount, createdQuote.currency)
  console.log('   Total (TTC):', createdQuote.totalWithTax, createdQuote.currency)
  console.log('   Items:', createdQuote.items.length)

  console.log('\n' + '='.repeat(60))
  console.log('🎉 SUCCESS! Full flow completed:')
  console.log('   AI extraction ✅')
  console.log('   Data transformation ✅')
  console.log('   Quote creation ✅')
  console.log('='.repeat(60))

  // Step 6: Verify quote exists
  console.log('\n6️⃣  Verifying quote in database...')
  const verifyResponse = await fetch(`http://localhost:5020/api/quotes/${createdQuote._id}`, {
    headers: { 'Cookie': authCookie }
  })

  if (verifyResponse.ok) {
    const verifiedQuote = await verifyResponse.json()
    console.log('✅ Quote verified in database')
    console.log('   Status:', verifiedQuote.status)
    console.log('   Items:', verifiedQuote.items.map(i => `${i.quantity}x ${i.label} @ ${i.price}€`).join(', '))
  } else {
    console.log('⚠️  Could not verify quote')
  }
}

testFullFlow().catch(err => {
  console.error('❌ Test failed:', err.message)
  console.error(err.stack)
})
