'use client'

import { getApiUrl } from '@ezstart/config'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export type PromoValidationStatus = 'valid' | 'invalid' | 'rate-limited'

/**
 * Validate a promo code against the ezpay API (where promo codes are managed).
 * Returns 'valid' if the code is accepted, 'rate-limited' if the API returns 429,
 * and 'invalid' for any other non-OK response or network error.
 */
async function validatePromoCodeApi(code: string, appName: string): Promise<PromoValidationStatus> {
  try {
    const baseUrl = getApiUrl('ezpay')
    const params = new URLSearchParams({ appName })
    const res = await fetch(
      `${baseUrl}/api/promos/validate/${encodeURIComponent(code)}?${params.toString()}`
    )
    if (res.status === 429) return 'rate-limited'
    if (!res.ok) return 'invalid'
    const data = await res.json()
    return data?.data?.valid === true ? 'valid' : 'invalid'
  } catch {
    return 'invalid'
  }
}

/**
 * Resolves a promo code with priority: prop > URL ?promo= > empty.
 * Validates promo codes against the ezpay API with debounce.
 *
 * Returns:
 * - promoCode: the current code string
 * - setPromoCode: setter for manual input
 * - isValid: null (not checked yet), true, or false
 * - isRateLimited: whether the last validation was blocked by rate limiting (429)
 * - isValidating: whether a validation request is in-flight
 * - isOpen: whether the promo section should be visible
 * - setIsOpen: toggle the promo section
 */
export function usePromoCode(appName: string, propPromoCode?: string) {
  const searchParams = useSearchParams()
  const urlPromo = searchParams?.get('promo') ?? ''

  // Priority: prop > URL > empty
  const initialPromo = useMemo(() => propPromoCode || urlPromo || '', [propPromoCode, urlPromo])

  const [promoCode, setPromoCode] = useState(initialPromo)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isRateLimited, setIsRateLimited] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialValidationDone = useRef(false)

  // Debounced validation when promoCode changes (manual typing)
  useEffect(() => {
    const trimmed = promoCode.trim()

    if (!trimmed) {
      setIsValid(null)
      setIsRateLimited(false)
      setIsValidating(false)
      return
    }

    // Skip debounce for initial auto-detected code (validate immediately)
    if (!initialValidationDone.current && trimmed === initialPromo.trim() && initialPromo) {
      initialValidationDone.current = true
      setIsValidating(true)
      validatePromoCodeApi(trimmed, appName).then(status => {
        setIsValid(status === 'valid')
        setIsRateLimited(status === 'rate-limited')
        setIsValidating(false)
        // Auto-open only if the initial code is valid
        if (status === 'valid') {
          setIsOpen(true)
        }
      })
      return
    }

    // Debounce for manual typing (500ms)
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsValidating(true)
    setIsValid(null)
    setIsRateLimited(false)

    timerRef.current = setTimeout(() => {
      validatePromoCodeApi(trimmed, appName).then(status => {
        setIsValid(status === 'valid')
        setIsRateLimited(status === 'rate-limited')
        setIsValidating(false)
      })
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [promoCode, initialPromo, appName])

  return {
    promoCode,
    setPromoCode,
    isValid,
    isRateLimited,
    isValidating,
    isOpen,
    setIsOpen,
  }
}
