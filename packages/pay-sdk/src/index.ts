// ============================================================
// Core (agnostic — zero React, zero @ezstart/*)
// ============================================================
export { PayClient } from './core/pay-client.js'
export type { PayClientConfig } from './core/types.js'

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
  Promo,
  PromoDiscountType,
  PromoDuration,
  CreatePromoRequest,
  UpdatePromoRequest,
  PromoResponse,
  PromosListResponse,
  PromoValidationResponse,
  Plan,
  CreatePlanRequest,
  UpdatePlanRequest,
  PlanResponse,
  PlansListResponse,
} from './core/types.js'

// Schemas
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
  promoDiscountTypeSchema,
  promoDurationSchema,
  createPromoSchema,
  updatePromoSchema,
  promoResponseSchema,
  promoValidationResponseSchema,
  planIntervalSchema,
  createPlanSchema,
  updatePlanSchema,
  planResponseSchema,
} from './core/schemas.js'

// Utils
export { formatCurrency, getCurrencySymbol } from './core/format-currency.js'

// ============================================================
// Monorepo wrapper (uses @ezstart/config for auto URL resolution)
// ============================================================
export { createPayClient } from './ezstart-pay.js'

// ============================================================
// React layer (provider, hooks, store)
// ============================================================
export { PayProvider, usePay, usePayContext } from './react/pay-provider.js'
export { usePayStore, usePayStoreSSR } from './react/store.js'
export type { PayState } from './react/store.js'

// Hooks
export { useDonations } from './react/hooks/useDonations.js'
export { usePurchases } from './react/hooks/usePurchases.js'
export { useSubscriptions } from './react/hooks/useSubscriptions.js'
export { useSubscriptionStatus } from './react/hooks/useSubscriptionStatus.js'
export { usePaymentHistory } from './react/hooks/usePaymentHistory.js'

// ============================================================
// Components (pre-built UI — depends on @ezstart/ui)
// ============================================================

// Donations
export { DonateButton } from './components/DonateButton.js'
export { DonateModal } from './components/DonateModal.js'
export type { DonateModalTexts, DonateModalProps } from './components/DonateModal.js'
export { DonationWall } from './components/DonationWall.js'
export { DonationCard } from './components/DonationCard.js'
export type { DonationCardProps, DonationCardTexts } from './components/DonationCard.js'

// Purchases
export { PurchaseButton } from './components/PurchaseButton.js'
export type { PurchaseButtonTexts, PurchaseButtonProps } from './components/PurchaseButton.js'
export { PurchaseCard } from './components/PurchaseCard.js'
export type { PurchaseCardProps, PurchaseCardTexts } from './components/PurchaseCard.js'

// Subscriptions
export { SubscribeButton } from './components/SubscribeButton.js'
export type { SubscribeButtonTexts, SubscribeButtonProps } from './components/SubscribeButton.js'
export { SubscriptionCard } from './components/SubscriptionCard.js'
export type { SubscriptionCardProps, SubscriptionCardTexts } from './components/SubscriptionCard.js'
export { SubscriptionPlanCard } from './components/SubscriptionPlanCard.js'
export type {
  SubscriptionPlanCardProps,
  SubscriptionPlanCardTexts,
} from './components/SubscriptionPlanCard.js'

// Promo Code
export { PromoCodeInput } from './components/PromoCodeInput.js'
export type {
  PromoCodeInputProps,
  PromoCodeInputTexts,
  PromoValidation,
} from './components/PromoCodeInput.js'

// Feature Gate
export { FeatureGate } from './components/FeatureGate.js'
export type { FeatureGateProps } from './components/FeatureGate.js'

// Confirm Action Dialog
export { ConfirmActionDialog } from './components/ConfirmActionDialog.js'
export type {
  ConfirmActionDialogProps,
  ConfirmActionDialogTexts,
} from './components/ConfirmActionDialog.js'

// Refund
export { RefundButton } from './components/RefundButton.js'
export type { RefundButtonProps, RefundButtonTexts } from './components/RefundButton.js'

// Dashboards
export { UserPaymentDashboard } from './components/UserPaymentDashboard.js'
export type {
  UserPaymentDashboardProps,
  UserPaymentDashboardTexts,
} from './components/UserPaymentDashboard.js'
export { PayAdminDashboard } from './components/PayAdminDashboard.js'
export type {
  PayAdminDashboardProps,
  PayAdminDashboardTexts,
} from './components/PayAdminDashboard.js'

// Payment Success
export { PaymentSuccessPage } from './components/PaymentSuccessPage.js'
export type { PaymentSuccessPageProps } from './components/PaymentSuccessPage.js'

// Marketplace
export { ProductCard } from './components/ProductCard.js'
export type { ProductCardProps, ProductCardTexts } from './components/ProductCard.js'
export { ProductGrid } from './components/ProductGrid.js'
export type {
  ProductGridProps,
  ProductGridTexts,
  ProductGridFilterOptions,
} from './components/ProductGrid.js'
export { PaymentHistory } from './components/PaymentHistory.js'
export type { PaymentHistoryProps, PaymentHistoryTexts } from './components/PaymentHistory.js'
