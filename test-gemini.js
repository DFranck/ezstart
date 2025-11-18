import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI('AIzaSyDCb48C2sRDHho6YHovYyk9BBwKrSetVbg')

const SYSTEM_PROMPT = `You are an invoice extraction assistant. Extract invoice/quote data from natural language and return ONLY valid JSON.

Return JSON with this structure (omit fields if not mentioned):
{
  "clientName": "string (client/customer name)",
  "items": [
    {
      "label": "string (item/service description)",
      "quantity": number,
      "price": number (unit price)
    }
  ],
  "description": "string (overall invoice description)",
  "dueDate": "YYYY-MM-DD (if mentioned)",
  "notes": "string (any additional notes)",
  "currency": "USD or EUR (default USD)",
  "taxRate": number (percentage, e.g., 20 for 20%)
}

IMPORTANT: Return ONLY the JSON object, no markdown, no explanation.`

async function test() {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    })

    const message = 'Quote for John Doe: 3 heures de consulting à 150€/h, 2 licences logiciel à 500€ chacune, TVA 20%, échéance 30 jours'

    const result = await model.generateContent(message)
    const content = result.response.text()

    console.log('Raw response:', content)

    const cleanedContent = content.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
    const parsed = JSON.parse(cleanedContent)

    console.log('\nParsed data:', JSON.stringify(parsed, null, 2))
  } catch (error) {
    console.error('Error:', error.message)
    if (error.response) {
      console.error('Response:', error.response)
    }
  }
}

test()
