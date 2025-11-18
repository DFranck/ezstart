// Test Gemini API directly
const GEMINI_API_KEY = 'AIzaSyDCb48C2sRDHho6YHovYyk9BBwKrSetVbg'

async function testGemini() {
  console.log('Testing Gemini API...\n')

  // Test 1: Check if model is available
  console.log('1. Checking available models...')
  try {
    const modelsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    )
    const modelsData = await modelsResponse.json()

    if (modelsData.error) {
      console.log('❌ Error fetching models:', modelsData.error.message)
      console.log('Status:', modelsData.error.status)
      return
    }

    console.log('✅ Available models:')
    modelsData.models
      ?.filter(m => m.name.includes('gemini'))
      .slice(0, 5)
      .forEach(model => {
        console.log(`   - ${model.name}`)
      })
  } catch (err) {
    console.log('❌ Failed to fetch models:', err.message)
    return
  }

  // Test 2: Try generating content with gemini-2.0-flash-exp
  console.log('\n2. Testing gemini-2.0-flash-exp...')
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Say hello in JSON format: {"message": "..."}' }]
          }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    const data = await response.json()

    if (data.error) {
      console.log('❌ Error:', data.error.message)
      console.log('Status:', data.error.status)
    } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('✅ Response:', data.candidates[0].content.parts[0].text)
    } else {
      console.log('❌ Unexpected response format:', JSON.stringify(data, null, 2))
    }
  } catch (err) {
    console.log('❌ Failed to generate content:', err.message)
  }

  // Test 3: Try with gemini-1.5-flash (fallback)
  console.log('\n3. Testing gemini-1.5-flash (fallback)...')
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: 'Say hello in JSON format: {"message": "..."}' }]
          }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: 'application/json'
          }
        })
      }
    )

    const data = await response.json()

    if (data.error) {
      console.log('❌ Error:', data.error.message)
      console.log('Status:', data.error.status)
    } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('✅ Response:', data.candidates[0].content.parts[0].text)
    } else {
      console.log('❌ Unexpected response format:', JSON.stringify(data, null, 2))
    }
  } catch (err) {
    console.log('❌ Failed to generate content:', err.message)
  }
}

testGemini()
