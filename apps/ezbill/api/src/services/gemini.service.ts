import { logger } from '@ezstart/logger/server'
import { GoogleGenerativeAI, FunctionDeclaration, Tool, SchemaType } from '@google/generative-ai'

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
  currency?: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'VND' | 'THB' | 'AUD' | 'CAD' | 'CNY' | 'CHF'
  taxRate?: number
}

// Types for conversational AI actions
export type InvoiceAction =
  | { type: 'update_items'; items: ExtractedInvoiceData['items'] }
  | { type: 'add_items'; items: ExtractedInvoiceData['items'] }
  | { type: 'remove_items'; indices: number[] }
  | { type: 'update_client'; clientName: string }
  | { type: 'update_description'; description: string }
  | { type: 'update_payment_terms'; notes: string }
  | { type: 'update_currency'; currency: ExtractedInvoiceData['currency'] }
  | { type: 'update_due_date'; dueDate: string }
  | { type: 'update_tax_rate'; taxRate: number }
  | { type: 'replace_all'; data: ExtractedInvoiceData }

export interface ConversationalResponse {
  action: InvoiceAction
  message: string // Message to show user
  suggestions?: string[] // Suggested next steps
  conversationState?: 'gathering_info' | 'refining_items' | 'configuring' | 'ready'
}

// Function declarations for Gemini to call
const updateItemsFunction: FunctionDeclaration = {
  name: 'update_items',
  description: 'Update existing invoice items (replace all items)',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      items: {
        type: SchemaType.ARRAY,
        description: 'Array of invoice items',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            label: { type: SchemaType.STRING, description: 'Item description' },
            quantity: { type: SchemaType.NUMBER, description: 'Quantity/hours' },
            price: { type: SchemaType.NUMBER, description: 'Unit price' },
          },
          required: ['label', 'quantity', 'price'],
        },
      },
    },
    required: ['items'],
  },
}

const addItemsFunction: FunctionDeclaration = {
  name: 'add_items',
  description: 'Add new items to the invoice without removing existing ones',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      items: {
        type: SchemaType.ARRAY,
        description: 'New items to add',
        items: {
          type: SchemaType.OBJECT,
          properties: {
            label: { type: SchemaType.STRING, description: 'Item description' },
            quantity: { type: SchemaType.NUMBER, description: 'Quantity/hours' },
            price: { type: SchemaType.NUMBER, description: 'Unit price' },
          },
          required: ['label', 'quantity', 'price'],
        },
      },
    },
    required: ['items'],
  },
}

const removeItemsFunction: FunctionDeclaration = {
  name: 'remove_items',
  description: 'Remove items from the invoice by their indices (0-based)',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      indices: {
        type: SchemaType.ARRAY,
        description: 'Indices of items to remove (0-based)',
        items: { type: SchemaType.NUMBER },
      },
    },
    required: ['indices'],
  },
}

const updateClientFunction: FunctionDeclaration = {
  name: 'update_client',
  description: 'Set or update client/customer name',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      clientName: { type: SchemaType.STRING, description: 'Client/customer name' },
    },
    required: ['clientName'],
  },
}

const updateDescriptionFunction: FunctionDeclaration = {
  name: 'update_description',
  description: 'Set or update invoice description',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      description: { type: SchemaType.STRING, description: 'Invoice description' },
    },
    required: ['description'],
  },
}

const updatePaymentTermsFunction: FunctionDeclaration = {
  name: 'update_payment_terms',
  description: 'Set payment terms and conditions in notes field',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      notes: { type: SchemaType.STRING, description: 'Payment terms and notes' },
    },
    required: ['notes'],
  },
}

const updateCurrencyFunction: FunctionDeclaration = {
  name: 'update_currency',
  description: 'Change the invoice currency',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      currency: {
        type: SchemaType.STRING,
        description: 'Currency code',
        format: 'enum',
        enum: ['USD', 'EUR', 'GBP', 'JPY', 'VND', 'THB', 'AUD', 'CAD', 'CNY', 'CHF'],
      },
    },
    required: ['currency'],
  },
}

const updateDueDateFunction: FunctionDeclaration = {
  name: 'update_due_date',
  description: 'Set or update invoice due date',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      dueDate: { type: SchemaType.STRING, description: 'Due date in YYYY-MM-DD format' },
    },
    required: ['dueDate'],
  },
}

const updateTaxRateFunction: FunctionDeclaration = {
  name: 'update_tax_rate',
  description: 'Set or update tax rate percentage',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      taxRate: { type: SchemaType.NUMBER, description: 'Tax rate percentage (e.g., 20 for 20%)' },
    },
    required: ['taxRate'],
  },
}

const replaceAllFunction: FunctionDeclaration = {
  name: 'replace_all',
  description: 'Replace all invoice data at once (use for initial extraction from timesheet/description)',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      clientName: { type: SchemaType.STRING },
      items: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            label: { type: SchemaType.STRING },
            quantity: { type: SchemaType.NUMBER },
            price: { type: SchemaType.NUMBER },
          },
        },
      },
      description: { type: SchemaType.STRING },
      dueDate: { type: SchemaType.STRING },
      notes: { type: SchemaType.STRING },
      currency: { type: SchemaType.STRING, format: 'enum', enum: ['USD', 'EUR', 'GBP', 'JPY', 'VND', 'THB', 'AUD', 'CAD', 'CNY', 'CHF'] },
      taxRate: { type: SchemaType.NUMBER },
    },
  },
}

const tools: Tool[] = [
  {
    functionDeclarations: [
      updateItemsFunction,
      addItemsFunction,
      removeItemsFunction,
      updateClientFunction,
      updateDescriptionFunction,
      updatePaymentTermsFunction,
      updateCurrencyFunction,
      updateDueDateFunction,
      updateTaxRateFunction,
      replaceAllFunction,
    ],
  },
]

const CONVERSATIONAL_PROMPT = `You are an intelligent invoice assistant for a fullstack developer (MERN stack, PostgreSQL, Zustand).

YOUR ROLE:
- Have natural conversations about invoices/quotes
- Understand developer work (frontend, backend, database, state management, etc.)
- Make intelligent decisions about data structure
- Use function calling to incrementally update the invoice
- Detect errors and ask for clarification

USER PROFILE (Developer):
- Skills: React/Next.js, Node.js/Express, MongoDB/PostgreSQL, Zustand, TypeScript
- Typical tasks: API development, frontend integration, database design, bug fixes, code review
- Default rate: Usually 30-35€/hour (but ask if not specified)
- Prefers: Detailed technical descriptions with bullet points

CONVERSATION FLOW:
1. **Initial extraction**: Use replace_all() for first timesheet/description
2. **Refinement**: Use specific functions (update_items, add_items, etc.) for changes
3. **Error detection**: If you see inconsistencies (duplicate dates, missing info), ASK instead of guessing
4. **Intelligent suggestions**: Propose next steps based on context

FUNCTION CALLING RULES:
- **replace_all**: Only for initial bulk extraction from timesheet
- **update_items**: When user wants to change ALL items (e.g., "make descriptions shorter")
- **add_items**: When user wants to ADD new items (e.g., "add 2 hours for testing")
- **remove_items**: When user wants to remove specific items by index
- **update_client, update_currency, etc.**: For specific field updates

FORMATTING BEST PRACTICES:
- Keep item labels concise but technical (max 150 chars)
- Use bullet points INSIDE labels for ALL items (including first): "• Login page • Dark mode • Responsive design"
- When listing multiple tasks in one label, use bullets for EVERY task (never start without a bullet)
- ONE item per day for timesheets (combine frontend+backend with bullets)
- Preserve technical details (feature names, technologies, file paths)
- CRITICAL: Always start multi-line labels with a bullet point, never plain text followed by bullets

ERROR DETECTION:
- Duplicate dates (e.g., "9 NOV Lundi" twice)
- Missing weekdays in sequence
- Inconsistent rates or currencies
- Missing critical info (client name, prices)

When you detect errors, respond naturally:
"I noticed you have Monday (9 NOV) listed twice. Did you mean Tuesday for the second one?"

EXAMPLES:

User: "Timesheet for TechCorp: Mon 3h frontend, Tue 5h backend"
You: replace_all({ clientName: "TechCorp", items: [...], currency: "EUR" })
     "I've created a 2-day timesheet (8h total). What's your hourly rate?"

User: "32€/hour"
You: update_items([{ label: "Mon: Frontend dev", quantity: 3, price: 32 }, ...])
     "Updated to 32€/h. Total: 256€. Should this be a quote or invoice?"

User: "Quote for now"
You: (just acknowledge, type is handled by UI)
     "Perfect! Quote ready. Need to add payment terms?"

User: "Yes, 50% upfront"
You: update_payment_terms("50% upfront, 50% on delivery")
     "Added payment terms. Anything else?"

User: "Make descriptions more readable"
You: update_items([{ label: "• Login page • Dark mode • Responsive design", ... }])
     "I've reformatted with bullet points. Better?"

IMPORTANT:
- Be conversational and helpful
- Use your knowledge of development work to fill in details intelligently
- Always call a function with your response (never just text)
- Ask for clarification when uncertain`

// NEW: Conversational AI with function calling
export async function chatWithInvoiceAssistant(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  currentInvoiceData?: ExtractedInvoiceData
): Promise<ConversationalResponse> {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash', // Use 2.5-flash (better quota than 2.0-exp)
      systemInstruction: CONVERSATIONAL_PROMPT,
      tools,
      generationConfig: {
        temperature: 0.7, // More creative for conversation
      },
    })

    // Build context with current invoice data
    let contextMessage = message
    if (currentInvoiceData && Object.keys(currentInvoiceData).length > 0) {
      const itemsSummary = currentInvoiceData.items
        ? `\nCurrent items:\n${currentInvoiceData.items.map((item, i) => `${i}. ${item.label} (${item.quantity}h @ ${item.price}€)`).join('\n')}`
        : ''
      const clientInfo = currentInvoiceData.clientName ? `\nClient: ${currentInvoiceData.clientName}` : ''
      const currency = currentInvoiceData.currency ? `\nCurrency: ${currentInvoiceData.currency}` : ''

      contextMessage = `Current invoice state:${clientInfo}${itemsSummary}${currency}\n\nUser message: ${message}`
    }

    let result

    // If conversation history exists, use chat mode
    if (conversationHistory && conversationHistory.length > 0) {
      // Filter out initial assistant message
      let filteredHistory = conversationHistory
      if (conversationHistory[0]?.role === 'assistant') {
        filteredHistory = conversationHistory.slice(1)
      }

      // Convert to Gemini format
      const history = filteredHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const chat = model.startChat({ history })
      result = await chat.sendMessage(contextMessage)
    } else {
      result = await model.generateContent(contextMessage)
    }

    const response = result.response

    // Check if AI wants to call a function
    const functionCall = response.functionCalls()?.[0]

    if (!functionCall) {
      // No function call, just text response (shouldn't happen with good prompt)
      return {
        action: { type: 'replace_all', data: {} },
        message: response.text() || 'I need more information. Can you provide details?',
        suggestions: ['Paste your timesheet', 'Tell me about the work you did'],
        conversationState: 'gathering_info',
      }
    }

    // Process function call
    const action = processFunctionCall(functionCall.name, functionCall.args)

    // Generate friendly response message
    const aiMessage = generateResponseMessage(action, functionCall.args)

    return {
      action,
      message: aiMessage,
      suggestions: generateSuggestions(action),
      conversationState: determineConversationState(action, currentInvoiceData),
    }
  } catch (error) {
    logger.error('Conversational AI error:', error)
    throw new Error('Failed to process conversation with AI')
  }
}

// Helper: Convert function call to action
function processFunctionCall(functionName: string, args: any): InvoiceAction {
  switch (functionName) {
    case 'update_items':
      return { type: 'update_items', items: args.items }
    case 'add_items':
      return { type: 'add_items', items: args.items }
    case 'remove_items':
      return { type: 'remove_items', indices: args.indices }
    case 'update_client':
      return { type: 'update_client', clientName: args.clientName }
    case 'update_description':
      return { type: 'update_description', description: args.description }
    case 'update_payment_terms':
      return { type: 'update_payment_terms', notes: args.notes }
    case 'update_currency':
      return { type: 'update_currency', currency: args.currency }
    case 'update_due_date':
      return { type: 'update_due_date', dueDate: args.dueDate }
    case 'update_tax_rate':
      return { type: 'update_tax_rate', taxRate: args.taxRate }
    case 'replace_all':
      return { type: 'replace_all', data: args }
    default:
      throw new Error(`Unknown function: ${functionName}`)
  }
}

// Helper: Generate friendly message
function generateResponseMessage(action: InvoiceAction, args: any): string {
  switch (action.type) {
    case 'replace_all': {
      const itemCount = args.items?.length || 0
      const totalHours = args.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0
      return `I've extracted ${itemCount} items (${totalHours}h total)${args.clientName ? ` for ${args.clientName}` : ''}. What's your hourly rate?`
    }
    case 'update_items': {
      const itemCount = action.items?.length || 0
      return `Updated ${itemCount} items. Better now?`
    }
    case 'add_items': {
      const itemCount = action.items?.length || 0
      return `Added ${itemCount} new item${itemCount > 1 ? 's' : ''}. Anything else?`
    }
    case 'remove_items': {
      const count = action.indices?.length || 0
      return `Removed ${count} item${count > 1 ? 's' : ''}. Anything else?`
    }
    case 'update_client':
      return `Client set to "${action.clientName}". What else?`
    case 'update_currency':
      return `Currency changed to ${action.currency}. Looking good?`
    case 'update_payment_terms':
      return `Payment terms added. Ready to save?`
    case 'update_due_date':
      return `Due date set to ${action.dueDate}. Anything else?`
    case 'update_tax_rate':
      return `Tax rate set to ${action.taxRate}%. All set?`
    default:
      return 'Updated. What next?'
  }
}

// Helper: Generate suggestions
function generateSuggestions(action: InvoiceAction): string[] {
  switch (action.type) {
    case 'replace_all':
      return ['Set hourly rate', 'Change descriptions', 'Add payment terms']
    case 'update_items':
      return ['Add more items', 'Change currency', 'Set due date']
    case 'add_items':
      return ['Update prices', 'Add payment terms', 'All done']
    default:
      return ['Make changes', 'All good, save it']
  }
}

// Helper: Determine conversation state
function determineConversationState(
  action: InvoiceAction,
  currentData?: ExtractedInvoiceData
): 'gathering_info' | 'refining_items' | 'configuring' | 'ready' {
  if (action.type === 'replace_all') {
    // Just extracted initial data
    const hasPrices = action.data.items?.some(item => item.price > 0)
    return hasPrices ? 'refining_items' : 'gathering_info'
  }

  if (action.type === 'update_items' || action.type === 'add_items') {
    return 'refining_items'
  }

  if (action.type === 'update_payment_terms' || action.type === 'update_due_date') {
    return 'configuring'
  }

  // Check if we have all essential data
  const hasClient = currentData?.clientName
  const hasItems = currentData?.items && currentData.items.length > 0
  const hasPrices = currentData?.items?.every(item => item.price > 0)

  if (hasClient && hasItems && hasPrices) {
    return 'ready'
  }

  return 'refining_items'
}

// LEGACY: Keep old function for backward compatibility
export async function extractInvoiceData(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<ExtractedInvoiceData> {
  // Use new conversational function and extract data from action
  const response = await chatWithInvoiceAssistant(message, conversationHistory)

  if (response.action.type === 'replace_all') {
    return response.action.data
  }

  // For other actions, return partial data
  const data: ExtractedInvoiceData = {}

  switch (response.action.type) {
    case 'update_items':
    case 'add_items':
      data.items = response.action.items
      break
    case 'update_client':
      data.clientName = response.action.clientName
      break
    case 'update_currency':
      data.currency = response.action.currency
      break
    case 'update_payment_terms':
      data.notes = response.action.notes
      break
    case 'update_due_date':
      data.dueDate = response.action.dueDate
      break
    case 'update_tax_rate':
      data.taxRate = response.action.taxRate
      break
  }

  return data
}
