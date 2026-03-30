'use client'

import { useAuth } from '@ezstart/auth-sdk'
import { usePay } from '@ezstart/pay-sdk'
import { useCallback, useEffect, useState } from 'react'

const PREMIUM_CACHE_KEY = 'fengshui-premium-status'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

type PremiumStatus = {
  isPremium: boolean
  type: 'oneshot' | 'subscription' | null
  expiresAt: string | null
}

function getCachedStatus(): PremiumStatus | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PREMIUM_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(PREMIUM_CACHE_KEY)
      return null
    }
    return cached.status
  } catch {
    return null
  }
}

function setCachedStatus(status: PremiumStatus) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PREMIUM_CACHE_KEY, JSON.stringify({ status, timestamp: Date.now() }))
  } catch {
    // Ignore storage errors
  }
}

export function usePremium() {
  const { user, isAuthenticated } = useAuth()
  const { client } = usePay()
  const [status, setStatus] = useState<PremiumStatus>({
    isPremium: false,
    type: null,
    expiresAt: null,
  })
  const [isLoading, setIsLoading] = useState(true)

  const checkPremium = useCallback(async () => {
    if (!isAuthenticated || !user?._id || !client) {
      setStatus({ isPremium: false, type: null, expiresAt: null })
      setIsLoading(false)
      return
    }

    // Check cache first
    const cached = getCachedStatus()
    if (cached) {
      setStatus(cached)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const res = await client.getPurchases({ userId: user._id })
      const activePurchase = res.payments?.find(
        (p: { projectId?: string; status?: string; type?: string }) =>
          p.projectId === 'fengshui' &&
          p.status === 'completed' &&
          (p.type === 'purchase' || p.type === 'subscription')
      )

      const newStatus: PremiumStatus = activePurchase
        ? {
            isPremium: true,
            type: activePurchase.type === 'subscription' ? 'subscription' : 'oneshot',
            expiresAt:
              ((activePurchase as unknown as Record<string, unknown>).expiresAt as string) || null,
          }
        : { isPremium: false, type: null, expiresAt: null }

      setStatus(newStatus)
      setCachedStatus(newStatus)
    } catch {
      // On error, default to non-premium
      setStatus({ isPremium: false, type: null, expiresAt: null })
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?._id, client])

  useEffect(() => {
    checkPremium()
  }, [checkPremium])

  return {
    isPremium: status.isPremium,
    premiumType: status.type,
    expiresAt: status.expiresAt,
    isLoading,
    isAuthenticated,
    refresh: checkPremium,
  }
}
