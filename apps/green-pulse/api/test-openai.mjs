import 'dotenv/config'
import OpenAI from 'openai'

console.log('🔍 Testing OpenAI configuration...\n')

// Check if API key is loaded
const apiKey = process.env.OPENAI_API_KEY
console.log('API Key loaded:', apiKey ? `Yes (${apiKey.slice(0, 10)}...)` : '❌ NO')

if (!apiKey || apiKey === 'sk-your-openai-api-key-here') {
  console.error('❌ OPENAI_API_KEY is not configured properly in .env.local')
  console.error('   Please add your real OpenAI API key')
  process.exit(1)
}

// Try to make a simple API call
const openai = new OpenAI({ apiKey })

try {
  console.log('\n📡 Testing API call...')
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'user', content: 'Say "Hello from GreenPulse!"' }
    ],
    max_tokens: 20
  })

  console.log('✅ Success!')
  console.log('Response:', response.choices[0]?.message?.content)
  console.log('\n🎉 OpenAI is configured correctly!')
} catch (error) {
  console.error('❌ Error calling OpenAI API:')
  console.error(error.message)
  if (error.code === 'invalid_api_key') {
    console.error('\n⚠️  Your API key is invalid. Please check:')
    console.error('   1. The key is correct')
    console.error('   2. You have added a payment method to your OpenAI account')
  }
  process.exit(1)
}
