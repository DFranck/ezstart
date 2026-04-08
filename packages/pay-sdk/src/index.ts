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
export { usePurchases } from './hooks/usePurchases.js'
export { useSubscriptions } from './hooks/useSubscriptions.js'
export { useSubscriptionStatus } from './hooks/useSubscriptionStatus.js'
export { usePaymentHistory } from './hooks/usePaymentHistory.js'

// Components - Donations
export { DonateButton } from './components/DonateButton.js'
export { DonateModal } from './components/DonateModal.js'
export type { DonateModalTexts, DonateModalProps } from './components/DonateModal.js'
export { DonationWall } from './components/DonationWall.js'

// Components - Purchases
export { PurchaseButton } from './components/PurchaseButton.js'
export type { PurchaseButtonTexts, PurchaseButtonProps } from './components/PurchaseButton.js'

// Components - Subscriptions
export { SubscribeButton } from './components/SubscribeButton.js'
export type { SubscribeButtonTexts, SubscribeButtonProps } from './components/SubscribeButton.js'

// Components - Promo Code
export { PromoCodeInput } from './components/PromoCodeInput.js'
export type {
  PromoCodeInputProps,
  PromoCodeInputTexts,
  PromoValidation,
} from './components/PromoCodeInput.js'

// Components - Subscriptions (management)
export { SubscriptionCard } from './components/SubscriptionCard.js'
export type { SubscriptionCardProps, SubscriptionCardTexts } from './components/SubscriptionCard.js'

// Components - Customer Portal
export { ManageSubscriptionButton } from './components/ManageSubscriptionButton.js'
export type {
  ManageSubscriptionButtonProps,
  ManageSubscriptionButtonTexts,
} from './components/ManageSubscriptionButton.js'

// Components - Feature Gate
export { FeatureGate } from './components/FeatureGate.js'
export type { FeatureGateProps } from './components/FeatureGate.js'

// Components - Confirm Action Dialog
export { ConfirmActionDialog } from './components/ConfirmActionDialog.js'
export type {
  ConfirmActionDialogProps,
  ConfirmActionDialogTexts,
} from './components/ConfirmActionDialog.js'

// Components - Refund
export { RefundButton } from './components/RefundButton.js'
export type { RefundButtonProps, RefundButtonTexts } from './components/RefundButton.js'

// Components - Dashboard
export { UserPaymentDashboard } from './components/UserPaymentDashboard.js'
export type {
  UserPaymentDashboardProps,
  UserPaymentDashboardTexts,
} from './components/UserPaymentDashboard.js'

// Components - Admin Dashboard
export { PayAdminDashboard } from './components/PayAdminDashboard.js'
export type {
  PayAdminDashboardProps,
  PayAdminDashboardTexts,
} from './components/PayAdminDashboard.js'

// Components - Payment Success
export { PaymentSuccessPage } from './components/PaymentSuccessPage.js'
export type { PaymentSuccessPageProps } from './components/PaymentSuccessPage.js'

// Components - Marketplace
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

// Components - SDK Payment Cards (EP-005)
export { SubscriptionPlanCard } from './components/SubscriptionPlanCard.js'
export type {
  SubscriptionPlanCardProps,
  SubscriptionPlanCardTexts,
} from './components/SubscriptionPlanCard.js'
export { DonationCard } from './components/DonationCard.js'
export type { DonationCardProps, DonationCardTexts } from './components/DonationCard.js'
export { PurchaseCard } from './components/PurchaseCard.js'
export type { PurchaseCardProps, PurchaseCardTexts } from './components/PurchaseCard.js'

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
} from './types.js'

// Utils
export { formatCurrency, getCurrencySymbol } from './utils/format-currency.js'

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
} from './schemas.js'
