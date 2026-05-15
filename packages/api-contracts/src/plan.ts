/**
 * Plan — pricing wire contracts.
 *
 * Canonical wire shape for billing `Plan` entities (Stripe-backed). Lives in
 * `@ezstart/api-contracts` so that any consumer (pay-sdk, ezpay API,
 * ezstart hub, third-party billing dashboards) reads from a single source
 * of truth.
 *
 * Money rules (cf. `standard-saas-billing.md` and `money.ts`):
 * - `amount` is integer **smallest currency unit** (cents for EUR/USD,
 *   whole yen for JPY). Floats are rejected at the wire level — the same
 *   `0.1 + 0.2 = 0.30000000000000004` bug that affects loose numbers.
 *   Plans differ from one-shot `Money` in that `amount = 0` is valid (free
 *   tier), so the schema accepts `>= 0` instead of strictly positive.
 * - `currency` is an ISO 4217 alpha-3 code (validated against the closed
 *   {@link CurrencyCodeSchema} enum).
 *
 * @see standard-saas-billing.md §1 (plans / pricing)
 */

import { z } from 'zod'

import { CurrencyCodeSchema } from './money.js'

// ---------------------------------------------------------------------------
// PlanInterval
// ---------------------------------------------------------------------------

/**
 * Billing interval for a recurring plan.
 *
 * - `month` — billed every N months (default 1)
 * - `year` — billed every N years (default 1)
 */
export const PlanIntervalSchema = z.enum(['month', 'year']).describe('Billing interval')

/** TypeScript union for {@link PlanIntervalSchema}. */
export type PlanInterval = z.infer<typeof PlanIntervalSchema>

// ---------------------------------------------------------------------------
// PlanMetadata — structured extras
// ---------------------------------------------------------------------------

/**
 * Structured extras attached to a Plan. Mirrors `PlanMetadata` in the
 * backend (`apps/ezpay/api/src/models/Plan.ts`).
 *
 * @example
 * ```ts
 * const metadata: PlanMetadata = {
 *   grantsFeatures: ['white-label', 'priority-support'],
 *   feePercent: 2.9,
 *   billingGroup: 'pro',
 *   discountVsMonthly: 20,
 * }
 * ```
 */
export const PlanMetadataSchema = z
  .object({
    /** Roles granted to the user when the subscription activates (JWT claim materialisation). */
    grantsRoles: z.array(z.string()).optional(),
    /** Features granted to the user when the subscription activates. */
    grantsFeatures: z.array(z.string()).optional(),
    /** Platform application fee percent applied to Connect charges for this plan (0-100). */
    feePercent: z.number().min(0).max(100).optional(),
    /**
     * Logical grouping identifier that links a Monthly plan to its Yearly
     * variant. Two plans sharing the same `billingGroup` are treated as
     * alternative billing cycles of the same tier by PricingPage's
     * Monthly/Yearly toggle.
     */
    billingGroup: z.string().optional(),
    /**
     * Headline savings (in %) of the Yearly variant vs the Monthly variant
     * in the same billingGroup. Purely decorative (rendered as "Save 20%").
     */
    discountVsMonthly: z.number().optional(),
  })
  .describe('Structured extras attached to a Plan')

/** TypeScript type for {@link PlanMetadataSchema}. */
export type PlanMetadata = z.infer<typeof PlanMetadataSchema>

// ---------------------------------------------------------------------------
// Plan.amount — integer cents, allows zero (free tier)
// ---------------------------------------------------------------------------

/**
 * Hard upper bound on a plan amount.
 *
 * `999_999_999` cents = ~€9.99M / $9.99M per billing cycle — comfortably
 * larger than any realistic plan price, comfortably smaller than int32 max
 * (2_147_483_647) so downstream 32-bit signed integer columns don't
 * overflow. Mirrors {@link AmountCentsSchema} from `money.ts`.
 *
 * @internal
 */
const PLAN_AMOUNT_CENTS_MAX = 999_999_999

/**
 * Plan amount in the currency's smallest unit ("cents" for EUR/USD,
 * whole yen for JPY).
 *
 * Differs from {@link AmountCentsSchema}: accepts `0` to model free plans
 * (Free / Hobby tiers). All other invariants are identical:
 * - integer (rejects floats — the financial-precision contract)
 * - non-negative (rejects `-100`)
 * - finite (rejects `NaN`, `Infinity`)
 * - bounded at `999_999_999`
 *
 * Servers should `PlanAmountCentsSchema.parse(req.body.amount)` and storage
 * layers should pin the column to a 64-bit signed integer.
 *
 * @example
 * ```ts
 * PlanAmountCentsSchema.parse(0)      // 0      — Free plan
 * PlanAmountCentsSchema.parse(1000)   // 1000   — €10.00 / $10.00
 * PlanAmountCentsSchema.parse(1.5)    // throws — must be integer
 * PlanAmountCentsSchema.parse(-100)   // throws — must be >= 0
 * ```
 */
export const PlanAmountCentsSchema = z
  .number()
  .int()
  .nonnegative()
  .finite()
  .max(PLAN_AMOUNT_CENTS_MAX, `Must be at most ${PLAN_AMOUNT_CENTS_MAX}`)
  .describe('Plan amount in integer cents (0..999999999, 0 = free)')

/** TypeScript type for {@link PlanAmountCentsSchema}. */
export type PlanAmountCents = z.infer<typeof PlanAmountCentsSchema>

// ---------------------------------------------------------------------------
// Plan — wire shape
// ---------------------------------------------------------------------------

/**
 * Plan entity — represents a Stripe-backed subscription plan.
 *
 * @example
 * ```ts
 * const plan: Plan = PlanSchema.parse({
 *   id: 'plan_pro',
 *   name: 'Pro',
 *   appName: 'myapp',
 *   amount: 1900,        // €19.00 (1900 cents)
 *   currency: 'EUR',
 *   interval: 'month',
 *   intervalCount: 1,
 *   active: true,
 *   sortOrder: 1,
 *   createdAt: '2026-01-01T00:00:00.000Z',
 *   updatedAt: '2026-01-01T00:00:00.000Z',
 * })
 * ```
 */
export const PlanSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    /**
     * @deprecated Read `applicationId` instead. Retained while the backend
     * dual-writes during the 90-day migration window.
     */
    appName: z.string(),
    /** Ezauth Application id this plan belongs to. */
    applicationId: z.string().optional(),
    description: z.string().optional(),
    amount: PlanAmountCentsSchema,
    currency: CurrencyCodeSchema,
    interval: PlanIntervalSchema,
    intervalCount: z.number().int().min(1),
    features: z.array(z.string()).optional(),
    active: z.boolean(),
    sortOrder: z.number().int(),
    stripePriceId: z.string().optional(),
    /**
     * Free-trial duration in days (0-90). `0` or `undefined` disables the
     * trial. Applied to Stripe Checkout subscription sessions via
     * `subscription_data.trial_period_days`.
     */
    trialDays: z.number().int().min(0).max(90).optional(),
    /** Structured extras: grants, fee %, billing group, yearly discount. */
    metadata: PlanMetadataSchema.optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .describe('Subscription plan — Stripe-backed')

/** TypeScript type for {@link PlanSchema}. */
export type Plan = z.infer<typeof PlanSchema>

// ---------------------------------------------------------------------------
// Plan request / response bodies
// ---------------------------------------------------------------------------

/** Body for `POST /plans`. */
export const CreatePlanRequestSchema = z
  .object({
    name: z.string(),
    /**
     * @deprecated Use `applicationId` instead. Kept for backward compatibility.
     */
    appName: z.string().optional(),
    /** Ezauth Application id this plan belongs to. Takes precedence over `appName`. */
    applicationId: z.string().optional(),
    description: z.string().optional(),
    amount: PlanAmountCentsSchema,
    currency: CurrencyCodeSchema,
    interval: PlanIntervalSchema,
    intervalCount: z.number().int().min(1),
    features: z.array(z.string()).optional(),
    sortOrder: z.number().int().optional(),
    stripePriceId: z.string().optional(),
    /** Free-trial duration in days (0-90). */
    trialDays: z.number().int().min(0).max(90).optional(),
    /** Structured extras — billingGroup, discountVsMonthly, grants, fee %. */
    metadata: PlanMetadataSchema.optional(),
  })
  .describe('Body for POST /plans')

/** TypeScript type for {@link CreatePlanRequestSchema}. */
export type CreatePlanRequest = z.infer<typeof CreatePlanRequestSchema>

/** Body for `PATCH /plans/:id`. */
export const UpdatePlanRequestSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    amount: PlanAmountCentsSchema.optional(),
    currency: CurrencyCodeSchema.optional(),
    interval: PlanIntervalSchema.optional(),
    intervalCount: z.number().int().min(1).optional(),
    features: z.array(z.string()).optional(),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    stripePriceId: z.string().nullable().optional(),
    /** Free-trial duration in days (0-90). `null` clears the trial. */
    trialDays: z.number().int().min(0).max(90).nullable().optional(),
    /** Structured extras — pass `null` as individual entries to clear them. */
    metadata: PlanMetadataSchema.optional(),
  })
  .describe('Body for PATCH /plans/:id')

/** TypeScript type for {@link UpdatePlanRequestSchema}. */
export type UpdatePlanRequest = z.infer<typeof UpdatePlanRequestSchema>

/** Response from `GET /plans/:id` / `POST /plans` / `PATCH /plans/:id`. */
export const PlanResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      plan: PlanSchema,
    }),
  })
  .describe('Single-plan response envelope')

/** TypeScript type for {@link PlanResponseSchema}. */
export type PlanResponse = z.infer<typeof PlanResponseSchema>

/** Response from `GET /plans`. */
export const PlansListResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.array(PlanSchema),
    meta: z.object({
      total: z.number(),
      limit: z.number(),
      offset: z.number(),
    }),
  })
  .describe('Paginated plans list response')

/** TypeScript type for {@link PlansListResponseSchema}. */
export type PlansListResponse = z.infer<typeof PlansListResponseSchema>
