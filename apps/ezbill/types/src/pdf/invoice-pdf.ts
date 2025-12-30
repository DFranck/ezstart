/**
 * PDF Invoice Data Type
 * Used for generating invoice PDFs with @react-pdf/renderer
 */
export interface PDFInvoiceData {
  documentNumber: string
  createdAt: string
  dueDate?: string
  status: string
  currency: string
  subtotal: number
  taxAmount: number
  total: number
  billingType: 'itemized' | 'flat-rate'
  // For itemized invoices
  items: Array<{
    label: string
    quantity: number
    price: number
  }>
  // For flat-rate invoices
  description?: string
  flatRateAmount?: number
  client: {
    clientName: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    postalCode?: string
    contactPersonName?: string
    contactPersonEmail?: string
    contactPersonPhone?: string
    contactPersonTitle?: string
  }
  company?: {
    companyName: string
    email?: string
    phone?: string
    address?: string
    city?: string
    country?: string
    postalCode?: string
    taxNumber?: string
  }
  notes?: string
  terms?: string
  paymentDetails?: {
    methodName?: string
    type?: string
    // Crypto fields
    walletAddress?: string
    currency?: string
    network?: string
    // Bank fields
    bankName?: string
    accountNumber?: string
    iban?: string
    swift?: string
    routingNumber?: string
    // Digital payment fields
    email?: string
    username?: string
    // General
    instructions?: string
  }
  // Support multiple payment methods
  paymentMethods?: Array<{
    methodName?: string
    type?: string
    // Crypto fields
    walletAddress?: string
    currency?: string
    network?: string
    // Bank fields
    bankName?: string
    accountNumber?: string
    iban?: string
    swift?: string
    routingNumber?: string
    // Digital payment fields
    email?: string
    username?: string
    // General
    instructions?: string
  }>
}
