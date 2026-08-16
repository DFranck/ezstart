import { describe, it, expect } from 'vitest'
import {
  deriveSubscriptionStatus,
  EMPTY_SUBSCRIPTION_SNAPSHOT,
} from '../../core/derive-subscription-status.js'
import type { Payment, Plan } from '../../core/types.js'

const subPayment: Payment = {
  id: 'pay_1',
  projectId: 'proj_1',
  projectName: 'Acme',
  type: 'subscription',
  amount: 1900,
  currency: 'EUR',
  provider: 'stripe',
  paymentId: 'sub_1',
  status: 'completed',
  isAnonymous: false,
  liveMode: true,
  cancelAtPeriodEnd: false,
  currentPeriodEnd: '2026-12-31T00:00:00.000Z',
  metadata: { planName: 'Pro', subscriptionStatus: 'active', features: ['F1', 'F2'] },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('deriveSubscriptionStatus', () => {
  it('returns EMPTY snapshot for an empty payment list', () => {
    expect(deriveSubscriptionStatus([])).toEqual(EMPTY_SUBSCRIPTION_SNAPSHOT)
  })

  it('ignores non-subscription / non-completed payments', () => {
    const donation: Payment = { ...subPayment, id: 'd_1', type: 'donation' }
    const pending: Payment = { ...subPayment, id: 'p_1', status: 'pending' }
    expect(deriveSubscriptionStatus([donation, pending])).toEqual(EMPTY_SUBSCRIPTION_SNAPSHOT)
  })

  it('derives an active snapshot with metadata features', () => {
    const snapshot = deriveSubscriptionStatus([subPayment])
    expect(snapshot).toEqual({
      isActive: true,
      isTrialing: false,
      isCanceling: false,
      plan: 'Pro',
      features: ['F1', 'F2'],
      periodEnd: '2026-12-31T00:00:00.000Z',
      subscription: subPayment,
    })
  })

  it('resolves features from plans when metadata has none', () => {
    const noFeatures: Payment = {
      ...subPayment,
      metadata: { planName: 'Pro', subscriptionStatus: 'active' },
    }
    const plans = [{ name: 'Pro', features: ['Plan F'] }] as unknown as Plan[]
    const snapshot = deriveSubscriptionStatus([noFeatures], plans)
    expect(snapshot.features).toEqual(['Plan F'])
  })

  it('leaves features empty when no matching plan is found', () => {
    const noFeatures: Payment = {
      ...subPayment,
      metadata: { planName: 'Unknown', subscriptionStatus: 'active' },
    }
    const plans = [{ name: 'Pro', features: ['Plan F'] }] as unknown as Plan[]
    const snapshot = deriveSubscriptionStatus([noFeatures], plans)
    expect(snapshot.features).toEqual([])
  })

  it('flags trialing + canceling', () => {
    const trial: Payment = {
      ...subPayment,
      cancelAtPeriodEnd: true,
      metadata: { planName: 'Pro', subscriptionStatus: 'trialing', features: ['F'] },
    }
    const snapshot = deriveSubscriptionStatus([trial])
    expect(snapshot.isTrialing).toBe(true)
    expect(snapshot.isCanceling).toBe(true)
  })

  it('keeps periodEnd null when currentPeriodEnd is absent', () => {
    const noEnd: Payment = { ...subPayment, currentPeriodEnd: undefined }
    const snapshot = deriveSubscriptionStatus([noEnd])
    expect(snapshot.periodEnd).toBeNull()
  })
})
