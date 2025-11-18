// Test EZBill AI with conversation history
async function testConversation() {
  console.log('Testing AI extraction with conversation history...\n')

  // Simulate a multi-turn conversation
  const conversation = []

  // Turn 1: Initial request
  console.log('👤 User: "Create a quote for TechCorp"')
  let response = await fetch('http://localhost:5020/api/ai/extract-invoice-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Create a quote for TechCorp',
      conversationHistory: conversation
    })
  })

  let data = await response.json()
  if (data.success) {
    console.log('🤖 AI extracted:', JSON.stringify(data.data, null, 2))
    conversation.push(
      { role: 'user', content: 'Create a quote for TechCorp' },
      { role: 'assistant', content: JSON.stringify(data.data) }
    )
  }

  // Turn 2: Add items
  console.log('\n👤 User: "Add 5 laptops at 1500€ each"')
  response = await fetch('http://localhost:5020/api/ai/extract-invoice-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Add 5 laptops at 1500€ each',
      conversationHistory: conversation
    })
  })

  data = await response.json()
  if (data.success) {
    console.log('🤖 AI extracted:', JSON.stringify(data.data, null, 2))
    conversation.push(
      { role: 'user', content: 'Add 5 laptops at 1500€ each' },
      { role: 'assistant', content: JSON.stringify(data.data) }
    )
  }

  // Turn 3: Add more items
  console.log('\n👤 User: "Also add 10 software licenses at 299€"')
  response = await fetch('http://localhost:5020/api/ai/extract-invoice-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Also add 10 software licenses at 299€',
      conversationHistory: conversation
    })
  })

  data = await response.json()
  if (data.success) {
    console.log('🤖 AI extracted:', JSON.stringify(data.data, null, 2))
    conversation.push(
      { role: 'user', content: 'Also add 10 software licenses at 299€' },
      { role: 'assistant', content: JSON.stringify(data.data) }
    )
  }

  // Turn 4: Set tax rate and due date
  console.log('\n👤 User: "Set tax rate to 20% and due date to January 31, 2026"')
  response = await fetch('http://localhost:5020/api/ai/extract-invoice-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'Set tax rate to 20% and due date to January 31, 2026',
      conversationHistory: conversation
    })
  })

  data = await response.json()
  if (data.success) {
    console.log('🤖 AI extracted (FINAL):', JSON.stringify(data.data, null, 2))

    // Validate final result
    console.log('\n' + '='.repeat(60))
    console.log('VALIDATION:')
    console.log('✅ Client name:', data.data.clientName === 'TechCorp' ? 'CORRECT' : 'WRONG')
    console.log('✅ Items count:', data.data.items?.length === 2 ? 'CORRECT (2 items)' : `WRONG (${data.data.items?.length} items)`)
    console.log('✅ Tax rate:', data.data.taxRate === 20 ? 'CORRECT (20%)' : `WRONG (${data.data.taxRate}%)`)
    console.log('✅ Due date:', data.data.dueDate === '2026-01-31' ? 'CORRECT' : `WRONG (${data.data.dueDate})`)
    console.log('✅ Currency:', data.data.currency === 'EUR' ? 'CORRECT' : `WRONG (${data.data.currency})`)
  }
}

testConversation()
