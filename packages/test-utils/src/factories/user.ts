import { Types } from 'mongoose'

export interface TestUser {
  _id: string
  email: string
  name: string
  createdAt: Date
  updatedAt: Date
}

/**
 * Create a test user with sensible defaults
 * Can be used across EZAuth, EZBill, EZPay, etc.
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  const now = new Date()

  return {
    _id: new Types.ObjectId().toString(),
    email: 'test@example.com',
    name: 'Test User',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

/**
 * Create multiple test users
 */
export function createTestUsers(count: number, overrides: Partial<TestUser> = {}): TestUser[] {
  return Array.from({ length: count }, (_, i) =>
    createTestUser({
      email: `test${i + 1}@example.com`,
      name: `Test User ${i + 1}`,
      ...overrides,
    })
  )
}
