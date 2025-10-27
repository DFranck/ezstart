/**
 * ⚠️ DEPRECATED: This function only works with localStorage auth mode.
 *
 * Since migration to httpOnly cookies, user data is no longer in localStorage.
 * Use the useAuth() hook or useUser() hook instead:
 *
 * @example
 * ```tsx
 * import { useUser } from '@ezstart/auth-sdk'
 *
 * function MyComponent() {
 *   const { user } = useUser()
 *   const userId = user?._id
 * }
 * ```
 *
 * This function is kept for backward compatibility but should not be used in new code.
 */
export function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined

  // Read from Zustand persist storage (works for both localStorage and httpOnly modes)
  // In httpOnly mode, user is hydrated from /api/auth/me on mount
  try {
    const authData = localStorage.getItem('ezauth-storage')
    if (authData) {
      const parsed = JSON.parse(authData)
      // Zustand persist structure: { state: { user, ... }, version: 0 }
      return parsed.state?.user?._id || undefined
    }
  } catch {
    return undefined
  }

  return undefined
}