/**
 * QR Codes utility helpers
 */

import type { Request } from 'express'

interface JwtPayload {
  userId?: string
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
}

/**
 * Decode a JWT payload without verification (base64url decode).
 * Safe to use after authMiddleware has already verified the token.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = parts[1]
    if (!payload) return null
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(decoded) as JwtPayload
  } catch {
    return null
  }
}

/**
 * Check if the current request comes from a user with admin or superadmin role.
 * Decodes the JWT without re-verifying (already verified by authMiddleware).
 */
export function isAdminFromToken(req: Request): boolean {
  const authHeader = req.headers.authorization
  const cookieHeader = req.headers.cookie || ''

  let token: string | undefined

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  } else {
    token = cookieHeader
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('ezauth_token='))
      ?.split('=')[1]
  }

  if (!token) return false

  const decoded = decodeJwtPayload(token)
  if (!decoded) return false

  // Check superadmin in globalRoles
  if (decoded.globalRoles?.includes('superadmin')) return true
  if (decoded.globalRoles?.includes('admin')) return true

  // Check admin in any app's roles
  if (decoded.appRoles) {
    const allRoles = Object.values(decoded.appRoles).flat()
    if (allRoles.includes('admin')) return true
  }

  return false
}
