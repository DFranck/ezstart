/**
 * Unit tests for `groupPlansForToggle` — PricingPage Monthly/Yearly grouping
 * helper introduced by P9-B.
 */
import { describe, it, expect, vi } from 'vitest'
import {
  uiComponentsMock,
  loggerMock,
  sonnerMock,
  uiUtilsMock,
  nextImageMock,
  nextNavigationMock,
} from './component-mocks.js'

vi.mock('@ezstart/ui/components', () => uiComponentsMock)
vi.mock('@ezstart/logger', () => loggerMock)
vi.mock('sonner', () => sonnerMock)
vi.mock('@ezstart/ui/utils', () => uiUtilsMock)
vi.mock('next/image', () => nextImageMock)
vi.mock('next/navigation', () => nextNavigationMock)

const { groupPlansForToggle } = await import('../../components/PricingPage.js')

import type { Plan } from '../../core/types.js'

function makePlan(overrides: Partial<Plan>): Plan {
  return {
    id: 'plan-id',
    name: 'Plan',
    appName: 'ezauth',
    amount: 999,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    active: true,
    sortOrder: 0,
    createdAt: '2026-04-20T00:00:00.000Z',
    updatedAt: '2026-04-20T00:00:00.000Z',
    ...overrides,
  }
}

describe('groupPlansForToggle', () => {
  it('groups monthly and yearly plans via metadata.billingGroup', () => {
    const monthly = makePlan({
      id: 'm',
      name: 'Pro',
      interval: 'month',
      amount: 999,
      metadata: { billingGroup: 'pro', discountVsMonthly: 0 },
    } as Partial<Plan>)
    const yearly = makePlan({
      id: 'y',
      name: 'Pro Yearly',
      interval: 'year',
      amount: 9990,
      metadata: { billingGroup: 'pro', discountVsMonthly: 20 },
    } as Partial<Plan>)

    const { groups, hasYearly, maxYearlyDiscount } = groupPlansForToggle([monthly, yearly])
    expect(hasYearly).toBe(true)
    expect(maxYearlyDiscount).toBe(20)
    expect(groups.size).toBe(1)
    const group = groups.get('pro')
    expect(group?.month?.id).toBe('m')
    expect(group?.year?.id).toBe('y')
  })

  it('falls back to plan.name when billingGroup is missing', () => {
    const monthly = makePlan({ id: 'm', name: 'Free', amount: 0 })
    const result = groupPlansForToggle([monthly])
    expect(result.hasYearly).toBe(false)
    expect(result.groups.get('Free')?.month?.id).toBe('m')
  })

  it('tracks the maximum discount across multiple yearly variants', () => {
    const y1 = makePlan({
      id: 'y1',
      interval: 'year',
      metadata: { billingGroup: 'pro', discountVsMonthly: 15 },
    } as Partial<Plan>)
    const y2 = makePlan({
      id: 'y2',
      interval: 'year',
      metadata: { billingGroup: 'business', discountVsMonthly: 25 },
    } as Partial<Plan>)

    const { maxYearlyDiscount } = groupPlansForToggle([y1, y2])
    expect(maxYearlyDiscount).toBe(25)
  })

  it('hasYearly is false when all plans are monthly', () => {
    const plans = [
      makePlan({ id: 'm1', name: 'Free', amount: 0 }),
      makePlan({ id: 'm2', name: 'Pro' }),
    ]
    const { hasYearly, maxYearlyDiscount } = groupPlansForToggle(plans)
    expect(hasYearly).toBe(false)
    expect(maxYearlyDiscount).toBe(0)
  })
})
