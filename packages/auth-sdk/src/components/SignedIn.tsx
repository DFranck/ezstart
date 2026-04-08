'use client'

import type { ReactNode } from 'react'
import { useAuth } from '../provider.js'

export interface SignedInProps {
  children: ReactNode
}

/**
 * Conditional wrapper that only renders children when the user is authenticated.
 *
 * @example
 * <SignedIn>
 *   <P>Welcome back!</P>
 * </SignedIn>
 */
export function SignedIn({ children }: SignedInProps) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return null
  return <>{children}</>
}
