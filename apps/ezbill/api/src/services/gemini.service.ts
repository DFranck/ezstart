import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

interface ExtractedInvoiceData {
  clientName?: string
  items?: Array<{
    label: string
    quantity: number
    price: number
  }>
  description?: string
  dueDate?: string
  notes?: string
  currency?: 'USD' | 'EUR'
  taxRate?: number
}

const SYSTEM_PROMPT = `You are an invoice extraction assistant. Extract invoice/quote data from natural language and return ONLY valid JSON.

Return JSON with this structure (omit fields if not mentioned):
{
  "clientName": "string (client/customer name)",
  "items": [
    {
      "label": "string (item description, max 150 chars for detailed work, 50 chars for simple items)",
      "quantity": number,
      "price": number (unit price, use 0 if not specified)
    }
  ],
  "description": "string (overall invoice description)",
  "dueDate": "YYYY-MM-DD (if mentioned)",
  "notes": "string (any additional notes)",
  "currency": "USD or EUR (default USD)",
  "taxRate": number (percentage, e.g., 20 for 20%)
}

Examples:
Input: "Invoice for John Doe, 3 hours consulting at $50/hr"
Output: {"clientName":"John Doe","items":[{"label":"Consulting services","quantity":3,"price":50}],"currency":"USD"}

Input: "Quote for ABC Corp: 2 laptops at 1200€ each, 1 monitor at 300€"
Output: {"clientName":"ABC Corp","items":[{"label":"Laptop","quantity":2,"price":1200},{"label":"Monitor","quantity":1,"price":300}],"currency":"EUR"}

Input: "Timesheet for TechCorp: Monday 3h frontend dev, Tuesday 5h backend, Wednesday 8h full-stack"
Output: {"clientName":"TechCorp","items":[{"label":"Mon: Frontend dev","quantity":3,"price":0},{"label":"Tue: Backend dev","quantity":5,"price":0},{"label":"Wed: Full-stack dev","quantity":8,"price":0}],"description":"Development timesheet"}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no explanation
- Keep item labels concise but informative (max 150 chars for detailed work logs)
- For timesheets: ONE item per day (not separate items for frontend/backend)
- If price is not mentioned, use 0 (user will fill it in later)
- Extract hours/quantities from timesheets and create items accordingly
- When reformatting: PRESERVE all technical details (feature names, technologies, etc.)
- Bullet points should be INSIDE the label text, NOT create separate items
- DO NOT split a day's work into multiple items (keep frontend+backend together)

Formatting rules:
- Use bullet points (• or -) WITHIN the label to separate tasks
- Format: "Day: Task1 • Task2 • Task3" or use line breaks within the label
- Keep the SAME number of items as the original (don't duplicate)`

export async function extractInvoiceData(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ExtractedInvoiceData> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // Updated to use available model
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    })

    let content: string

    // If conversation history exists, use chat mode for context
    if (conversationHistory && conversationHistory.length > 0) {
      // Convert conversation history to Gemini format
      // Filter out initial assistant message if history starts with assistant
      let filteredHistory = conversationHistory
      if (conversationHistory[0]?.role === 'assistant') {
        filteredHistory = conversationHistory.slice(1) // Remove first assistant message
      }

      const history = filteredHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      // Start chat with history
      const chat = model.startChat({ history })
      const result = await chat.sendMessage(message)
      content = result.response.text()
    } else {
      // No history, use single generateContent
      const result = await model.generateContent(message)
      content = result.response.text()
    }

    // Parse the response
    try {
      // Clean potential markdown code blocks
      const cleanedContent = content.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '')
      return JSON.parse(cleanedContent) as ExtractedInvoiceData
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', content)
      throw new Error('Failed to parse invoice data from AI response')
    }
  } catch (error) {
    console.error('Gemini extraction error:', error)
    throw new Error('Failed to extract invoice data with Gemini')
  }
}
