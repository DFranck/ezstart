'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

export type PromoValidationStatus = 'valid' | 'invalid' | 'rate-limited'

/**
 * Validate a promo code against an EZPay-compatible API.
 *
 * Returns:
 * - `'valid'` when the API responds 200 with `{ data: { valid: true } }`
 * - `'rate-limited'` when the API responds 429
 * - `'invalid'` for any other non-OK response or network error
 *
 * @internal
 */
async function validatePromoCodeApi(
  code: string,
  appName: string,
  apiUrl: string
): Promise<PromoValidationStatus> {
  try {
    const base = apiUrl.replace(/\/+$/, '')
    const params = new URLSearchParams({ appName })
    const res = await fetch(
      `${base}/api/promos/validate/${encodeURIComponent(code)}?${params.toString()}`
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
 * Resolves a promo code with priority: prop > URL `?promo=` > empty.
 * Validates promo codes against an EZPay-compatible API with debounce.
 *
 * The API base URL is required so the hook stays agnostic of any
 * monorepo URL helpers — pass the same value the consumer already uses
 * for `<PayProvider apiUrl=...>`. When `apiUrl` is empty / undefined
 * the hook returns `isValid: null` and never fires a network request.
 *
 * @example
 * ```tsx
 * const promo = usePromoCode('myapp', urlPromo, 'https://api.example.com')
 * ```
 */
export function usePromoCode(appName: string, propPromoCode?: string, apiUrl?: string) {
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

    // No API URL configured — promo validation is opt-in.
    if (!apiUrl) {
      setIsValid(null)
      setIsRateLimited(false)
      setIsValidating(false)
      return
    }

    // Skip debounce for initial auto-detected code (validate immediately)
    if (!initialValidationDone.current && trimmed === initialPromo.trim() && initialPromo) {
      initialValidationDone.current = true
      setIsValidating(true)
      validatePromoCodeApi(trimmed, appName, apiUrl).then(status => {
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
      validatePromoCodeApi(trimmed, appName, apiUrl).then(status => {
        setIsValid(status === 'valid')
        setIsRateLimited(status === 'rate-limited')
        setIsValidating(false)
      })
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [promoCode, initialPromo, appName, apiUrl])

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
