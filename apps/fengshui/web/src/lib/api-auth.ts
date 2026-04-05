import { NextRequest } from 'next/server'
import { getApiUrl } from '@ezstart/config/urls'
import { logger } from '@ezstart/logger'

export interface ApiUser {
  _id: string
  email: string
  username: string
  role?: string
}

/**
 * Extract authenticated user from a Next.js API route request.
 * Supports both Bearer token and httpOnly cookie auth modes.
 */
export async function getAuthUser(req: NextRequest): Promise<ApiUser | null> {
  // Try Bearer token first
  const token = req.headers.get('authorization')?.replace('Bearer ', '')

  // Try cookie fallback
  const cookie = req.cookies.get('ezauth_token')?.value

  if (!token && !cookie) {
    return null
  }

  try {
    const ezauthApiUrl = getApiUrl('ezauth')

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // Forward the auth method
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const cookieHeader = token ? undefined : `ezauth_token=${cookie}`

    const res = await fetch(`${ezauthApiUrl}/api/auth/me`, {
      headers: {
        ...headers,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    })

    if (!res.ok) {
      return null
    }

    const json = await res.json()
    const data = json.data ?? json
    return data.user as ApiUser
  } catch (err) {
    logger.error(
      '[api-auth] Failed to verify user:',
      err instanceof Error ? err.message : String(err)
    )
    return null
  }
}
