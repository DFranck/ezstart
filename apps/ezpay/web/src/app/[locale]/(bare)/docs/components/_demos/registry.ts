/**
 * Demo registry — maps component names to their lazy-loaded demo files.
 *
 * Each entry is a `React.lazy()` wrapper so Webpack code-splits the demo
 * module out of the main bundle. The registry is the single source of
 * truth — adding a new component means: (1) write
 * `_demos/<ComponentName>.demo.tsx`, (2) register it here.
 */

import { lazy, type ComponentType } from 'react'

export type DemoComponent = ComponentType<Record<string, never>>

export const demoRegistry: Record<string, DemoComponent> = {
  // Donations
  DonateButton: lazy(() => import('./DonateButton.demo')),
  DonateModal: lazy(() => import('./DonateModal.demo')),
  DonationCard: lazy(() => import('./DonationCard.demo')),
  DonationWall: lazy(() => import('./DonationWall.demo')),

  // Subscriptions
  SubscribeButton: lazy(() => import('./SubscribeButton.demo')),
  SubscriptionCard: lazy(() => import('./SubscriptionCard.demo')),
  SubscriptionPlanCard: lazy(() => import('./SubscriptionPlanCard.demo')),
  ChangePlanButton: lazy(() => import('./ChangePlanButton.demo')),

  // Billing & Pricing
  PricingPage: lazy(() => import('./PricingPage.demo')),
  BillingDashboard: lazy(() => import('./BillingDashboard.demo')),
  InvoiceHistorySection: lazy(() => import('./InvoiceHistorySection.demo')),
  ManageSubscriptionButton: lazy(() => import('./ManageSubscriptionButton.demo')),
  PastDueBanner: lazy(() => import('./PastDueBanner.demo')),

  // Purchases & Marketplace
  PurchaseButton: lazy(() => import('./PurchaseButton.demo')),
  PurchaseCard: lazy(() => import('./PurchaseCard.demo')),
  ProductCard: lazy(() => import('./ProductCard.demo')),
  ProductGrid: lazy(() => import('./ProductGrid.demo')),
  PaymentHistory: lazy(() => import('./PaymentHistory.demo')),

  // Callback Pages
  PaymentSuccessPage: lazy(() => import('./PaymentSuccessPage.demo')),
  DonateSuccessPage: lazy(() => import('./DonateSuccessPage.demo')),
  DonateCancelPage: lazy(() => import('./DonateCancelPage.demo')),
  SubscribeSuccessPage: lazy(() => import('./SubscribeSuccessPage.demo')),
  SubscribeCancelPage: lazy(() => import('./SubscribeCancelPage.demo')),
  PurchaseSuccessPage: lazy(() => import('./PurchaseSuccessPage.demo')),
  PurchaseCancelPage: lazy(() => import('./PurchaseCancelPage.demo')),

  // Stripe Connect
  ConnectStatusCard: lazy(() => import('./ConnectStatusCard.demo')),
  ConnectOnboardForm: lazy(() => import('./ConnectOnboardForm.demo')),
  ConnectFeeSummary: lazy(() => import('./ConnectFeeSummary.demo')),
  DeveloperConnectDashboard: lazy(() => import('./DeveloperConnectDashboard.demo')),

  // Admin & Developer
  PayAdminDashboard: lazy(() => import('./PayAdminDashboard.demo')),
  PlansManager: lazy(() => import('./PlansManager.demo')),
  PlanEditorDialog: lazy(() => import('./PlanEditorDialog.demo')),
  PayDeveloperPortal: lazy(() => import('./PayDeveloperPortal.demo')),
  CreatePayKeyModal: lazy(() => import('./CreatePayKeyModal.demo')),
  UserPaymentDashboard: lazy(() => import('./UserPaymentDashboard.demo')),

  // Utilities & Gates
  FeatureGate: lazy(() => import('./FeatureGate.demo')),
  ConfirmActionDialog: lazy(() => import('./ConfirmActionDialog.demo')),
  PromoCodeInput: lazy(() => import('./PromoCodeInput.demo')),
  RefundButton: lazy(() => import('./RefundButton.demo')),
  PayNotConfiguredCard: lazy(() => import('./PayNotConfiguredCard.demo')),
}
