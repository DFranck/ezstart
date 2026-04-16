/**
 * Tests for auth middleware functions.
 * Tests populateUserFromToken and isAdminUser logic.
 *
 * The auth module calls createEzstartAuth() at import time, which requires
 * JWT_SECRET. We mock the api-core dependency to avoid that requirement,
 * then import our actual middleware functions.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { Request } from 'express'

// Mock @ezstart/api-core's createEzstartAuth to avoid JWT_SECRET requirement
vi.mock('@ezstart/api-core', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    createEzstartAuth: () => ({
      authMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
      optionalAuthMiddleware: (_req: unknown, _res: unknown, next: () => void) => next(),
    }),
  }
})

// Now safe to import — createEzstartAuth is mocked
const { isAdminUser, populateUserFromToken } = await import('../../middleware/auth.js')

// ========================================
// Helper to create mock Request objects
// ========================================

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    userId: undefined,
    user: undefined,
    ...overrides,
  } as unknown as Request
}

describe('Auth Middleware', () => {
  describe('populateUserFromToken', () => {
    it('should call next without populating if no userId', () => {
      const req = createMockRequest({ userId: undefined })
      const res = {} as never
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      populateUserFromToken(req, res, next)
      expect(nextCalled).toBe(true)
      expect(req.user).toBeUndefined()
    })

    it('should decode JWT payload from Authorization header', () => {
      const payload = {
        userId: 'user_123',
        email: 'test@test.com',
        username: 'testuser',
        globalRoles: ['superadmin'],
        appRoles: { ezpay: ['admin'] },
      }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const mockToken = `eyJ.${encodedPayload}.sig`

      const req = createMockRequest({
        userId: 'user_123',
        headers: {
          authorization: `Bearer ${mockToken}`,
        },
      })
      const res = {} as never
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      populateUserFromToken(req, res, next)
      expect(nextCalled).toBe(true)
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe('user_123')
      expect(req.user?.email).toBe('test@test.com')
    })

    it('should decode JWT payload from cookie', () => {
      const payload = {
        userId: 'user_cookie',
        email: 'cookie@test.com',
        globalRoles: ['user'],
      }
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
      const mockToken = `eyJ.${encodedPayload}.sig`

      const req = createMockRequest({
        userId: 'user_cookie',
        headers: {
          cookie: `other=abc; ezauth_token=${mockToken}; session=xyz`,
        },
      })
      const res = {} as never
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      populateUserFromToken(req, res, next)
      expect(nextCalled).toBe(true)
      expect(req.user).toBeDefined()
      expect(req.user?.userId).toBe('user_cookie')
    })

    it('should prefer Authorization header over cookie', () => {
      const headerPayload = {
        userId: 'user_header',
        email: 'header@test.com',
        globalRoles: ['superadmin'],
      }
      const cookiePayload = {
        userId: 'user_cookie',
        email: 'cookie@test.com',
        globalRoles: ['user'],
      }
      const headerToken = `eyJ.${Buffer.from(JSON.stringify(headerPayload)).toString('base64url')}.sig`
      const cookieToken = `eyJ.${Buffer.from(JSON.stringify(cookiePayload)).toString('base64url')}.sig`

      const req = createMockRequest({
        userId: 'user_header',
        headers: {
          authorization: `Bearer ${headerToken}`,
          cookie: `ezauth_token=${cookieToken}`,
        },
      })
      const res = {} as never
      const next = () => {}

      populateUserFromToken(req, res, next)
      expect(req.user?.email).toBe('header@test.com')
    })

    it('should handle malformed token gracefully', () => {
      const req = createMockRequest({
        userId: 'user_bad',
        headers: {
          authorization: 'Bearer invalid.not-base64.token',
        },
      })
      const res = {} as never
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      populateUserFromToken(req, res, next)
      expect(nextCalled).toBe(true)
    })

    it('should handle missing token gracefully', () => {
      const req = createMockRequest({
        userId: 'user_notoken',
        headers: {},
      })
      const res = {} as never
      let nextCalled = false
      const next = () => {
        nextCalled = true
      }

      populateUserFromToken(req, res, next)
      expect(nextCalled).toBe(true)
    })
  })

  describe('isAdminUser', () => {
    it('should return false when req.user is undefined', () => {
      const req = createMockRequest({ user: undefined })
      expect(isAdminUser(req)).toBe(false)
    })

    it('should return true for superadmin global role', () => {
      const req = createMockRequest({
        user: {
          userId: 'admin_1',
          globalRoles: ['superadmin'],
          appRoles: {},
        } as Express.Request['user'],
      })
      expect(isAdminUser(req)).toBe(true)
    })

    it('should return true for admin global role', () => {
      const req = createMockRequest({
        user: {
          userId: 'admin_2',
          globalRoles: ['admin'],
          appRoles: {},
        } as Express.Request['user'],
      })
      expect(isAdminUser(req)).toBe(true)
    })

    it('should return true for ezpay app-level admin', () => {
      const req = createMockRequest({
        user: {
          userId: 'app_admin',
          globalRoles: ['user'],
          appRoles: { ezpay: ['admin'] },
        } as Express.Request['user'],
      })
      expect(isAdminUser(req)).toBe(true)
    })

    it('should return false for regular user', () => {
      const req = createMockRequest({
        user: {
          userId: 'regular',
          globalRoles: ['user'],
          appRoles: { ezpay: ['user'] },
        } as Express.Request['user'],
      })
      expect(isAdminUser(req)).toBe(false)
    })

    it('should return false for admin of different app', () => {
      const req = createMockRequest({
        user: {
          userId: 'other_admin',
          globalRoles: ['user'],
          appRoles: { ezbill: ['admin'] },
        } as Express.Request['user'],
      })
      expect(isAdminUser(req)).toBe(false)
    })
  })
})
