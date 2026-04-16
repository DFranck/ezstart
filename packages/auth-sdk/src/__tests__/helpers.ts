import type { AuthUser } from '../core/types.js'

/** Factory for a test AuthUser. */
export function createTestUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    _id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    isVerified: true,
    apps: ['myapp'],
    roles: ['user'],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

/** Create a fake JWT token with a given expiry (seconds from now). */
export function createFakeJWT(expiresInSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(
    JSON.stringify({
      userId: 'user-123',
      email: 'test@example.com',
      exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
    })
  )
  return `${header}.${payload}.fake-signature`
}

/** Create an expired JWT. */
export function createExpiredJWT(): string {
  return createFakeJWT(-60) // expired 60s ago
}
