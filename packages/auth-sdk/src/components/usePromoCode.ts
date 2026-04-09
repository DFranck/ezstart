'use client'

import { getApiUrl } from '@ezstart/config'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const PROMO_STORAGE_KEY = 'gp_promo_code'

/**
 * Validate a promo code against the ezpay API (where promo codes are managed).
 */
async function validatePromoCodeApi(code: string, appName: string): Promise<boolean> {
  try {
    const baseUrl = getApiUrl('ezpay')
    const params = new URLSearchParams({ appName })
    const res = await fetch(
      `${baseUrl}/api/promos/validate/${encodeURIComponent(code)}?${params.toString()}`
    )
    if (!res.ok) return false
    const data = await res.json()
    return data?.data?.valid === true
  } catch {
    return false
  }
}

/**
 * Resolves a promo code with priority: prop > URL ?promo= > localStorage > empty.
 * Also persists URL promo codes to localStorage for later retrieval.
 * Validates promo codes against the API with debounce.
 *
 * Returns:
 * - promoCode: the current code string
 * - setPromoCode: setter for manual input
 * - isValid: null (not checked yet), true, or false
 * - isValidating: whether a validation request is in-flight
 * - isOpen: whether the promo section should be visible
 * - setIsOpen: toggle the promo section
 */
export function usePromoCode(appName: string, propPromoCode?: string) {
  const searchParams = useSearchParams()
  const urlPromo = searchParams?.get('promo') ?? ''

  // Persist URL promo to localStorage
  useEffect(() => {
    if (urlPromo) {
      try {
        localStorage.setItem(PROMO_STORAGE_KEY, urlPromo)
      } catch {
        // localStorage unavailable (SSR, incognito)
      }
    }
  }, [urlPromo])

  const [storedPromo] = useState(() => {
    try {
      return localStorage.getItem(PROMO_STORAGE_KEY) ?? ''
    } catch {
      return ''
    }
  })

  // Priority: prop > URL > localStorage > empty
  const initialPromo = useMemo(
    () => propPromoCode || urlPromo || storedPromo || '',
    [propPromoCode, urlPromo, storedPromo]
  )

  const [promoCode, setPromoCode] = useState(initialPromo)
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialValidationDone = useRef(false)

  // Debounced validation when promoCode changes (manual typing)
  useEffect(() => {
    const trimmed = promoCode.trim()

    if (!trimmed) {
      setIsValid(null)
      setIsValidating(false)
      return
    }

    // Skip debounce for initial auto-detected code (validate immediately)
    if (!initialValidationDone.current && trimmed === initialPromo.trim() && initialPromo) {
      initialValidationDone.current = true
      setIsValidating(true)
      validatePromoCodeApi(trimmed, appName).then(valid => {
        setIsValid(valid)
        setIsValidating(false)
        // Auto-open only if the initial code is valid
        if (valid) {
          setIsOpen(true)
        }
      })
      return
    }

    // Debounce for manual typing (500ms)
    if (timerRef.current) clearTimeout(timerRef.current)
    setIsValidating(true)
    setIsValid(null)

    timerRef.current = setTimeout(() => {
      validatePromoCodeApi(trimmed, appName).then(valid => {
        setIsValid(valid)
        setIsValidating(false)
      })
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [promoCode, initialPromo])

  return { promoCode, setPromoCode, isValid, isValidating, isOpen, setIsOpen }
}
