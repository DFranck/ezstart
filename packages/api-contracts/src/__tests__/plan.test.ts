import { describe, expect, expectTypeOf, it } from 'vitest'
import {
  CreatePlanRequestSchema,
  PlanAmountCentsSchema,
  PlanIntervalSchema,
  PlanMetadataSchema,
  PlanResponseSchema,
  PlanSchema,
  PlansListResponseSchema,
  UpdatePlanRequestSchema,
  type CreatePlanRequest,
  type Plan,
  type PlanAmountCents,
  type PlanInterval,
  type PlanMetadata,
  type PlanResponse,
  type PlansListResponse,
  type UpdatePlanRequest,
} from '../plan.js'

describe('PlanIntervalSchema', () => {
  it('accepts month and year', () => {
    expect(PlanIntervalSchema.parse('month')).toBe('month')
    expect(PlanIntervalSchema.parse('year')).toBe('year')
  })

  it('rejects unknown intervals', () => {
    expect(() => PlanIntervalSchema.parse('week')).toThrow()
    expect(() => PlanIntervalSchema.parse('day')).toThrow()
    expect(() => PlanIntervalSchema.parse('')).toThrow()
  })

  it('exports the type union', () => {
    expectTypeOf<PlanInterval>().toEqualTypeOf<'month' | 'year'>()
  })
})

describe('PlanAmountCentsSchema (Money/Currency integration)', () => {
  it('accepts 0 (free tier)', () => {
    expect(PlanAmountCentsSchema.parse(0)).toBe(0)
  })

  it('accepts positive integer cents', () => {
    expect(PlanAmountCentsSchema.parse(1000)).toBe(1000) // €10.00
    expect(PlanAmountCentsSchema.parse(999_999_999)).toBe(999_999_999)
  })

  it('rejects floats (the precision contract — closes audit finding)', () => {
    expect(() => PlanAmountCentsSchema.parse(1.5)).toThrow()
    expect(() => PlanAmountCentsSchema.parse(0.1 + 0.2)).toThrow()
    expect(() => PlanAmountCentsSchema.parse(19.99)).toThrow()
  })

  it('rejects negative values', () => {
    expect(() => PlanAmountCentsSchema.parse(-1)).toThrow()
    expect(() => PlanAmountCentsSchema.parse(-1000)).toThrow()
  })

  it('rejects NaN / Infinity', () => {
    expect(() => PlanAmountCentsSchema.parse(NaN)).toThrow()
    expect(() => PlanAmountCentsSchema.parse(Infinity)).toThrow()
    expect(() => PlanAmountCentsSchema.parse(-Infinity)).toThrow()
  })

  it('rejects values above the max', () => {
    expect(() => PlanAmountCentsSchema.parse(1_000_000_000)).toThrow()
  })

  it('rejects strings (must be a number, not a coerced string)', () => {
    expect(() => PlanAmountCentsSchema.parse('1000')).toThrow()
  })

  it('exports the PlanAmountCents type', () => {
    expectTypeOf<PlanAmountCents>().toEqualTypeOf<number>()
  })
})

describe('PlanMetadataSchema', () => {
  it('accepts an empty metadata', () => {
    expect(PlanMetadataSchema.parse({})).toEqual({})
  })

  it('accepts every field', () => {
    const meta: PlanMetadata = {
      grantsRoles: ['admin', 'editor'],
      grantsFeatures: ['white-label', 'priority-support'],
      feePercent: 2.9,
      billingGroup: 'pro',
      discountVsMonthly: 20,
    }
    expect(PlanMetadataSchema.parse(meta)).toEqual(meta)
  })

  it('rejects feePercent out of range', () => {
    expect(() => PlanMetadataSchema.parse({ feePercent: 101 })).toThrow()
    expect(() => PlanMetadataSchema.parse({ feePercent: -1 })).toThrow()
  })
})

describe('PlanSchema', () => {
  const baseValid: Plan = {
    id: 'plan_pro',
    name: 'Pro',
    appName: 'myapp',
    amount: 1900,
    currency: 'EUR',
    interval: 'month',
    intervalCount: 1,
    active: true,
    sortOrder: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }

  it('accepts the minimal valid Plan', () => {
    expect(PlanSchema.parse(baseValid)).toEqual(baseValid)
  })

  it('accepts a free plan (amount=0)', () => {
    const free: Plan = { ...baseValid, name: 'Free', amount: 0 }
    expect(PlanSchema.parse(free).amount).toBe(0)
  })

  it('Money/Currency integration: amount validated as integer cents', () => {
    expect(() => PlanSchema.parse({ ...baseValid, amount: 19.99 })).toThrow()
    expect(() => PlanSchema.parse({ ...baseValid, amount: 0.1 + 0.2 })).toThrow()
  })

  it('Money/Currency integration: currency validated against ISO 4217 enum', () => {
    expect(PlanSchema.parse({ ...baseValid, currency: 'USD' }).currency).toBe('USD')
    expect(PlanSchema.parse({ ...baseValid, currency: 'JPY' }).currency).toBe('JPY')
    expect(() => PlanSchema.parse({ ...baseValid, currency: 'eur' })).toThrow() // lowercase
    expect(() => PlanSchema.parse({ ...baseValid, currency: 'XYZ' })).toThrow() // not in list
  })

  it('accepts every supported ISO 4217 currency', () => {
    for (const currency of ['EUR', 'USD', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL']) {
      expect(PlanSchema.parse({ ...baseValid, currency }).currency).toBe(currency)
    }
  })

  it('accepts a fully-populated Plan with metadata', () => {
    const full: Plan = {
      ...baseValid,
      applicationId: 'app_xyz',
      description: 'Pro tier',
      features: ['white-label', 'priority-support'],
      stripePriceId: 'price_xxx',
      trialDays: 14,
      metadata: {
        billingGroup: 'pro',
        feePercent: 2.9,
        grantsFeatures: ['white-label'],
      },
    }
    expect(PlanSchema.parse(full)).toEqual(full)
  })

  it('rejects missing required fields', () => {
    expect(() => PlanSchema.parse({ ...baseValid, id: undefined })).toThrow()
    expect(() => PlanSchema.parse({ ...baseValid, name: undefined })).toThrow()
    expect(() => PlanSchema.parse({ ...baseValid, amount: undefined })).toThrow()
    expect(() => PlanSchema.parse({ ...baseValid, currency: undefined })).toThrow()
    expect(() => PlanSchema.parse({ ...baseValid, interval: undefined })).toThrow()
    expect(() => PlanSchema.parse({ ...baseValid, active: undefined })).toThrow()
  })

  it('rejects trialDays > 90', () => {
    expect(() => PlanSchema.parse({ ...baseValid, trialDays: 100 })).toThrow()
  })

  it('rejects trialDays < 0', () => {
    expect(() => PlanSchema.parse({ ...baseValid, trialDays: -1 })).toThrow()
  })

  it('rejects intervalCount < 1', () => {
    expect(() => PlanSchema.parse({ ...baseValid, intervalCount: 0 })).toThrow()
    expect(() => PlanSchema.parse({ ...baseValid, intervalCount: -1 })).toThrow()
  })

  describe('stripeProductId (Stripe Connect/Pay setup)', () => {
    it('accepts a valid stripeProductId string', () => {
      const parsed = PlanSchema.safeParse({ ...baseValid, stripeProductId: 'prod_abc123' })
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.stripeProductId).toBe('prod_abc123')
    })

    it('treats missing stripeProductId as undefined (optional)', () => {
      const parsed = PlanSchema.safeParse(baseValid)
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.stripeProductId).toBeUndefined()
    })

    it('rejects empty stripeProductId (.min(1))', () => {
      const parsed = PlanSchema.safeParse({ ...baseValid, stripeProductId: '' })
      expect(parsed.success).toBe(false)
    })

    it('rejects non-string stripeProductId', () => {
      const parsed = PlanSchema.safeParse({
        ...baseValid,
        stripeProductId: 12345 as unknown as string,
      })
      expect(parsed.success).toBe(false)
    })

    it('rejects stripeProductId exceeding 255 chars', () => {
      const parsed = PlanSchema.safeParse({
        ...baseValid,
        stripeProductId: 'prod_' + 'x'.repeat(260),
      })
      expect(parsed.success).toBe(false)
    })

    it('exports stripeProductId as string | undefined on the type', () => {
      expectTypeOf<Plan>().toHaveProperty('stripeProductId').toEqualTypeOf<string | undefined>()
    })
  })

  describe('isTestMode (Stripe-pattern test/live partition)', () => {
    it('accepts isTestMode=true', () => {
      const parsed = PlanSchema.safeParse({ ...baseValid, isTestMode: true })
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.isTestMode).toBe(true)
    })

    it('accepts isTestMode=false', () => {
      const parsed = PlanSchema.safeParse({ ...baseValid, isTestMode: false })
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.isTestMode).toBe(false)
    })

    it('treats missing isTestMode as undefined (optional, legacy backcompat)', () => {
      const parsed = PlanSchema.safeParse(baseValid)
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(parsed.data.isTestMode).toBeUndefined()
    })

    it('rejects non-boolean isTestMode (no string coercion)', () => {
      const parsed = PlanSchema.safeParse({
        ...baseValid,
        isTestMode: 'true' as unknown as boolean,
      })
      expect(parsed.success).toBe(false)
    })

    it('rejects numeric isTestMode (no truthy coercion)', () => {
      const parsed = PlanSchema.safeParse({
        ...baseValid,
        isTestMode: 1 as unknown as boolean,
      })
      expect(parsed.success).toBe(false)
    })

    it('exports isTestMode as boolean | undefined on the type', () => {
      expectTypeOf<Plan>().toHaveProperty('isTestMode').toEqualTypeOf<boolean | undefined>()
    })
  })
})

describe('CreatePlanRequestSchema', () => {
  it('accepts a P6+ create request', () => {
    const req: CreatePlanRequest = {
      name: 'Pro',
      applicationId: 'app_xyz',
      amount: 1900,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
    }
    expect(CreatePlanRequestSchema.parse(req)).toEqual(req)
  })

  it('accepts a legacy appName create request', () => {
    const req: CreatePlanRequest = {
      name: 'Pro',
      appName: 'myapp',
      amount: 1900,
      currency: 'EUR',
      interval: 'month',
      intervalCount: 1,
    }
    expect(CreatePlanRequestSchema.parse(req)).toEqual(req)
  })

  it('rejects float amount (Money contract)', () => {
    expect(() =>
      CreatePlanRequestSchema.parse({
        name: 'Pro',
        applicationId: 'app_xyz',
        amount: 19.99,
        currency: 'EUR',
        interval: 'month',
        intervalCount: 1,
      })
    ).toThrow()
  })

  it('rejects invalid currency', () => {
    expect(() =>
      CreatePlanRequestSchema.parse({
        name: 'Pro',
        applicationId: 'app_xyz',
        amount: 1900,
        currency: 'eur',
        interval: 'month',
        intervalCount: 1,
      })
    ).toThrow()
  })
})

describe('UpdatePlanRequestSchema', () => {
  it('accepts every field as optional', () => {
    expect(UpdatePlanRequestSchema.parse({})).toEqual({})
  })

  it('accepts a partial update', () => {
    const req: UpdatePlanRequest = { name: 'Pro Plus', amount: 2900 }
    expect(UpdatePlanRequestSchema.parse(req)).toEqual(req)
  })

  it('accepts description=null (clear)', () => {
    expect(UpdatePlanRequestSchema.parse({ description: null })).toEqual({ description: null })
  })

  it('accepts trialDays=null (clear)', () => {
    expect(UpdatePlanRequestSchema.parse({ trialDays: null })).toEqual({ trialDays: null })
  })

  it('rejects amount float (Money contract preserved on updates)', () => {
    expect(() => UpdatePlanRequestSchema.parse({ amount: 19.99 })).toThrow()
  })
})

describe('PlanResponseSchema', () => {
  it('accepts a single-plan response envelope', () => {
    const res: PlanResponse = {
      success: true,
      data: {
        plan: {
          id: 'plan_pro',
          name: 'Pro',
          appName: 'myapp',
          amount: 1900,
          currency: 'EUR',
          interval: 'month',
          intervalCount: 1,
          active: true,
          sortOrder: 1,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      },
    }
    expect(PlanResponseSchema.parse(res)).toEqual(res)
  })
})

describe('PlansListResponseSchema', () => {
  it('accepts an empty list', () => {
    const res: PlansListResponse = {
      success: true,
      data: [],
      meta: { total: 0, limit: 50, offset: 0 },
    }
    expect(PlansListResponseSchema.parse(res)).toEqual(res)
  })

  it('accepts a populated list', () => {
    const res: PlansListResponse = {
      success: true,
      data: [
        {
          id: 'plan_free',
          name: 'Free',
          appName: 'myapp',
          amount: 0,
          currency: 'EUR',
          interval: 'month',
          intervalCount: 1,
          active: true,
          sortOrder: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      meta: { total: 1, limit: 50, offset: 0 },
    }
    expect(PlansListResponseSchema.parse(res)).toEqual(res)
  })
})
