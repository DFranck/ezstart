import type { Invoice } from '@ezbill/types'

/**
 * Create a test invoice with sensible defaults
 * EZBill-specific test factory
 */
export function createTestInvoice(overrides: Partial<Invoice> = {}): Invoice {
  const now = new Date().toISOString()
  const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  return {
    _id: Math.random().toString(36).substring(7),
    userId: Math.random().toString(36).substring(7),
    clientId: Math.random().toString(36).substring(7),
    documentNumber: 'INV-001',
    status: 'draft',
    billingType: 'itemized',
    items: [
      {
        _id: Math.random().toString(36).substring(7),
        label: 'Test Service',
        quantity: 1,
        price: 100,
      },
    ],
    subtotal: 100,
    taxAmount: 20,
    total: 120,
    currency: 'USD',
    dueDate,
    notes: '',
    exchangeRate: {
      from: 'USD',
      to: 'USD',
      rate: 1,
      source: 'test',
      fetchedAt: now,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create multiple test invoices
 */
export function createTestInvoices(count: number, overrides: Partial<Invoice> = {}): Invoice[] {
  return Array.from({ length: count }, (_, i) =>
    createTestInvoice({
      documentNumber: `INV-${String(i + 1).padStart(3, '0')}`,
      ...overrides,
    })
  )
}

/**
 * Create a paid invoice
 */
export function createPaidInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return createTestInvoice({
    status: 'paid',
    ...overrides,
  })
}
