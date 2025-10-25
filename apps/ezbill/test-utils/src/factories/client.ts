import type { Client } from '@ezbill/types'

/**
 * Create a test client with sensible defaults
 * EZBill-specific test factory
 */
export function createTestClient(overrides: Partial<Client> = {}): Client {
  const now = new Date().toISOString()

  return {
    _id: Math.random().toString(36).substring(7),
    userId: Math.random().toString(36).substring(7),
    clientName: 'Test Client Inc.',
    email: 'client@example.com',
    phone: '+1234567890',
    isCompany: true,
    address: '123 Test Street',
    city: 'Test City',
    postalCode: '12345',
    country: 'USA',
    companyRegistrationNumber: 'REG123456',
    taxNumber: 'TAX789',
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create multiple test clients
 */
export function createTestClients(count: number, overrides: Partial<Client> = {}): Client[] {
  return Array.from({ length: count }, (_, i) =>
    createTestClient({
      clientName: `Test Client ${i + 1}`,
      email: `client${i + 1}@example.com`,
      ...overrides,
    })
  )
}
