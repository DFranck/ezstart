// ============================================================
// Core (agnostic — zero React, zero @ezstart/*)
// ============================================================
export { createPayClient } from './core/pay-client.js'
export type { PayClient } from './core/pay-client.js'
export type { PayClientConfig } from './core/types.js'

// Typed error class + parsers (agnostic — replaces api-sdk's parseApiError)
export { PayError, parsePayError, parsePayErrorCode, payErrorFromResponse } from './core/errors.js'
export type { PayErrorDetail } from './core/errors.js'

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
  GetPaymentsParams,
  PlanResponse,
  PlansListResponse,
  ConnectedAccount,
  ConnectAccountType,
  ConnectAccountStatus,
  ConnectStatusResponse,
  ConnectOnboardRequest,
  ConnectOnboardResponse,
  ConnectDashboardLinkResponse,
  PayApiKeyItem,
  CreatePayApiKeyRequest,
  CreatePayApiKeyResponse,
  PayApiKeyUsageResponse,
  SubscriptionStatusSnapshot,
} from './core/types.js'

// Subscription status derivation (shared with the server SSR companion)
export {
  deriveSubscriptionStatus,
  EMPTY_SUBSCRIPTION_SNAPSHOT,
} from './core/derive-subscription-status.js'

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
  promoSchema,
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
// React layer (provider, hooks, store)
// ============================================================
export {
  PayProvider,
  usePay,
  usePayContext,
  useApplicationContext,
  usePayLocale,
  usePayLogger,
} from './react/pay-provider.js'
export type { Logger } from './react/pay-provider.js'
export { usePayStore, usePayStoreSSR } from './react/store.js'
export type { PayState } from './react/store.js'

// Hooks
export { useDonations } from './react/hooks/useDonations.js'
export { usePurchases } from './react/hooks/usePurchases.js'
export {
  useSubscriptions,
  SUBSCRIPTIONS_QUERY_KEY,
  subscriptionsQueryKey,
} from './react/hooks/useSubscriptions.js'
export { useSubscriptionStatus } from './react/hooks/useSubscriptionStatus.js'
export { usePaymentHistory } from './react/hooks/usePaymentHistory.js'
export { usePlans } from './react/hooks/usePlans.js'
export { useCancelSubscription } from './react/hooks/useCancelSubscription.js'
export type { UseCancelSubscriptionCallbacks } from './react/hooks/useCancelSubscription.js'
export { useRefundPayment } from './react/hooks/useRefundPayment.js'
export type { UseRefundPaymentCallbacks } from './react/hooks/useRefundPayment.js'

// Connect hooks
export { useConnectStatus } from './react/hooks/useConnectStatus.js'
export { useConnectOnboard } from './react/hooks/useConnectOnboard.js'
export { useConnectDashboardLink } from './react/hooks/useConnectDashboardLink.js'
export { useConnectDisconnect } from './react/hooks/useConnectDisconnect.js'

// API Keys hooks (P6 — requires @tanstack/react-query peer dep)
export { usePayKeys, PAY_KEYS_QUERY_KEY, payKeysQueryKey } from './react/hooks/usePayKeys.js'
export type { UsePayKeysOptions } from './react/hooks/usePayKeys.js'
export { useCreatePayKey } from './react/hooks/useCreatePayKey.js'
export type { UseCreatePayKeyCallbacks } from './react/hooks/useCreatePayKey.js'
export { useRevokePayKey } from './react/hooks/useRevokePayKey.js'
export type { UseRevokePayKeyCallbacks } from './react/hooks/useRevokePayKey.js'
export { useRotatePayKey } from './react/hooks/useRotatePayKey.js'
export type { UseRotatePayKeyCallbacks } from './react/hooks/useRotatePayKey.js'
export { usePayKeyUsage, payKeyUsageQueryKey } from './react/hooks/usePayKeyUsage.js'
export type { UsePayKeyUsageOptions } from './react/hooks/usePayKeyUsage.js'

// ============================================================
// Components (pre-built UI — depends on @ezstart/ui)
// ============================================================

// Graceful fallback (shared)
export { PayNotConfiguredCard, classifyPayError } from './components/common/PayNotConfiguredCard.js'
export type {
  PayNotConfiguredCardProps,
  PayNotConfiguredReason,
  PayNotConfiguredTexts,
} from './components/common/PayNotConfiguredCard.js'

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

// Pricing & Billing
export { PricingPage } from './components/PricingPage.js'
export type { PricingPageProps, PricingPageTexts } from './components/PricingPage.js'
export { BillingDashboard } from './components/BillingDashboard.js'
export type { BillingDashboardProps, BillingDashboardTexts } from './components/BillingDashboard.js'

// Stripe Connect
export { ConnectStatusCard } from './components/ConnectStatusCard.js'
export type {
  ConnectStatusCardProps,
  ConnectStatusCardTexts,
} from './components/ConnectStatusCard.js'
export { ConnectOnboardForm } from './components/ConnectOnboardForm.js'
export type {
  ConnectOnboardFormProps,
  ConnectOnboardFormTexts,
} from './components/ConnectOnboardForm.js'
export { ConnectFeeSummary } from './components/ConnectFeeSummary.js'
export type {
  ConnectFeeSummaryProps,
  ConnectFeeSummaryTexts,
} from './components/ConnectFeeSummary.js'
export { DeveloperConnectDashboard } from './components/DeveloperConnectDashboard.js'
export type {
  DeveloperConnectDashboardProps,
  DeveloperConnectDashboardTexts,
} from './components/DeveloperConnectDashboard.js'

// Developer Portal — API Keys (P6)
export { PayDeveloperPortal } from './components/developer/PayDeveloperPortal.js'
export type { PayDeveloperPortalProps } from './components/developer/PayDeveloperPortal.js'
export { CreatePayKeyModal } from './components/developer/CreatePayKeyModal.js'
export type { CreatePayKeyModalProps } from './components/developer/CreatePayKeyModal.js'
export type {
  PayDeveloperPortalTexts,
  PayApiKeysTableTexts,
  CreatePayKeyModalTexts,
  KeyCreatedModalTexts as PayKeyCreatedModalTexts,
} from './components/developer/types.js'
export { defaultPayDeveloperPortalTexts } from './components/developer/types.js'
