/**
 * PDF Receipt Data Type
 * Used for generating receipt PDFs with @react-pdf/renderer
 */
export interface PDFReceiptData {
  documentNumber: string
  createdAt: string
  paymentDate?: string
  status: string
  currency: string
  subtotal: number
  taxAmount: number
  total: number
  items: Array<{
    label: string
    quantity: number
    price: number
  }>
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
  invoiceReference?: string // Reference to original invoice
}
