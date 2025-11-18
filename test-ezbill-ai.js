// Test EZBill AI extraction endpoint
async function testAIExtraction() {
  const testCases = [
    {
      name: 'Quote FR - Consulting + Licenses',
      text: 'Devis pour Jean Dupont : 3 heures de consulting à 150€/h, 2 licences logiciel à 500€ chacune, TVA 20%, échéance 30 jours'
    },
    {
      name: 'Quote EN - Simple items',
      text: 'Quote for John Doe: 5 hours training at $120/hour, 1 software license at $299'
    },
    {
      name: 'Invoice with due date',
      text: 'Invoice for ABC Corp: 10 laptops at 1200€ each, due date December 31 2025, tax rate 20%'
    }
  ]

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Testing: ${testCase.name}`)
    console.log(`Input: ${testCase.text}`)
    console.log('='.repeat(60))

    try {
      const response = await fetch('http://localhost:5020/api/ai/extract-invoice-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: testCase.text })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ SUCCESS')
        console.log(JSON.stringify(data.data, null, 2))
      } else {
        console.log('❌ FAILED')
        console.log('Error:', data.error)
        console.log('Message:', data.message)
      }
    } catch (err) {
      console.log('❌ REQUEST ERROR')
      console.error(err.message)
    }
  }
}

testAIExtraction()
