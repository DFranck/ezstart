'use client'

import type { ReactNode } from 'react'
import { useAuth } from '../react/hooks.js'

export interface SignedOutProps {
  children: ReactNode
}

/**
 * Conditional wrapper that only renders children when the user is NOT authenticated.
 *
 * @example
 * <SignedOut>
 *   <LoginButton />
 * </SignedOut>
 */
export function SignedOut({ children }: SignedOutProps) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return null
  return <>{children}</>
}
