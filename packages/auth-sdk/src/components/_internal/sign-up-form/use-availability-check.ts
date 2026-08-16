'use client'

import { apiCall } from '@ezstart/api-sdk'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Debounced email/username availability checks for `<SignUpForm>`.
 *
 * Watches the form's email + username values and, 500ms after the user stops
 * typing, hits `/auth/check-availability`. Failures are swallowed silently —
 * the check is purely advisory (the server re-validates on submit).
 *
 * @internal
 */
export function useAvailabilityCheck(
  watchEmail: string,
  watchUsername: string
): {
  emailAvailable: boolean | null
  usernameAvailable: boolean | null
} {
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const emailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const usernameTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkAvailability = useCallback(async (field: 'email' | 'username', value: string) => {
    if (!value || value.length < 3) {
      if (field === 'email') setEmailAvailable(null)
      else setUsernameAvailable(null)
      return
    }

    try {
      const params = new URLSearchParams({ [field]: value })
      const data = await apiCall<{
        emailAvailable?: boolean
        usernameAvailable?: boolean
      }>(`/auth/check-availability?${params.toString()}`, {
        appName: 'ezauth',
        method: 'GET',
      })
      if (field === 'email') setEmailAvailable(data.emailAvailable ?? null)
      else setUsernameAvailable(data.usernameAvailable ?? null)
    } catch {
      // Silently fail — availability check is non-critical
    }
  }, [])

  useEffect(() => {
    if (emailTimerRef.current) clearTimeout(emailTimerRef.current)
    setEmailAvailable(null)
    emailTimerRef.current = setTimeout(() => checkAvailability('email', watchEmail), 500)
    return () => {
      if (emailTimerRef.current) clearTimeout(emailTimerRef.current)
    }
  }, [watchEmail, checkAvailability])

  useEffect(() => {
    if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    setUsernameAvailable(null)
    usernameTimerRef.current = setTimeout(() => checkAvailability('username', watchUsername), 500)
    return () => {
      if (usernameTimerRef.current) clearTimeout(usernameTimerRef.current)
    }
  }, [watchUsername, checkAvailability])

  return { emailAvailable, usernameAvailable }
}
