// Plan Types
//
// These wire shapes moved to `@ezstart/api-contracts` in v1.1.0 so that any
// service (ezpay API, ezauth API, future) and any client agree on the same
// shape without taking a backward dep on pay-sdk. The re-exports below
// preserve the original import path (`@ezstart/pay-sdk` → `Plan`, etc.) so
// existing consumer call sites keep working unchanged.
//
// As part of the move, `amount` is now validated as integer cents at the
// contract level (rejecting floats — the financial-precision bug the audit
// flagged) and `currency` is validated against the closed ISO 4217 enum
// from `@ezstart/api-contracts/money`.

/**
 * @deprecated Import from `@ezstart/api-contracts` instead.
 */
export type {
  CreatePlanRequest,
  Plan,
  PlanInterval,
  PlanMetadata,
  PlanResponse,
  PlansListResponse,
  UpdatePlanRequest,
} from '@ezstart/api-contracts'
