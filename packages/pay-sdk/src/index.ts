// Client
export { PayClient, createPayClient } from './client.js'
export type { PayClientConfig } from './types.js'

// Store
export { usePayStore, usePayStoreSSR } from './store.js'
export type { PayState } from './store.js'

// Provider and hooks
export { PayProvider, usePay, usePayContext } from './provider.js'

// Hooks
export { useDonations } from './hooks/useDonations.js'

// Components - Donations
export { DonateButton } from './components/DonateButton.js'
export { DonateModal } from './components/DonateModal.js'
export { DonationWall } from './components/DonationWall.js'

// Re-export types
export type {
  Payment,
  Donation,
  Purchase,
  Subscription,
  Invoice,
  PaymentType,
  PaymentStatus,
  PaymentProvider,
  CreateDonationRequest,
  CreatePurchaseRequest,
  CreateSubscriptionRequest,
  PaymentResponse,
  PaymentsListResponse,
  StatsResponse,
} from './types.js'

// Zod schemas for validation and OpenAPI
export {
  paymentStatusSchema,
  paymentTypeSchema,
  paymentProviderSchema,
  basePaymentSchema,
  createDonationSchema,
  createPurchaseSchema,
  createSubscriptionSchema,
  paymentResponseSchema,
  paymentsListResponseSchema,
  statsResponseSchema,
  errorResponseSchema,
} from './schemas.js'
