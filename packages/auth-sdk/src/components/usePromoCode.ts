'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const PROMO_STORAGE_KEY = 'gp_promo_code'

/**
 * Resolves a promo code with priority: prop > URL ?promo= > localStorage > empty.
 * Also persists URL promo codes to localStorage for later retrieval.
 */
export function usePromoCode(propPromoCode?: string) {
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
  const resolvedPromo = useMemo(
    () => propPromoCode || urlPromo || storedPromo || '',
    [propPromoCode, urlPromo, storedPromo]
  )

  return resolvedPromo
}
