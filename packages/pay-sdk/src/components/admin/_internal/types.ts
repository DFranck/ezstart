/**
 * Shared types for the PayAdminDashboard internal sections.
 *
 * Each section ships its own `Texts` interface with English defaults; the
 * top-level `<PayAdminDashboard>` aggregates them under a single `texts` prop
 * (Partial deep-merge). Sections are not re-exported — the dashboard is the
 * single canonical entry point.
 *
 * @internal
 */

// ===== OVERVIEW SECTION =====

/**
 * Per-currency revenue breakdown returned by the analytics overview endpoint.
 */
export interface PayRevenueByCurrency {
  currency: string
  total: number
}

/**
 * One day on the revenue trend (last 30 days). `date` is YYYY-MM-DD UTC.
 */
export interface PayRevenueTrendPoint {
  date: string
  total: number
  currency: string
}

/**
 * One row in the top-apps-by-revenue table.
 */
export interface PayTopApp {
  appName: string
  total: number
  currency: string
}

/**
 * Platform analytics overview returned by `GET /api/admin/analytics/overview`
 * on the ezpay API. Mirrors the auth-sdk `AdminAnalyticsOverview` shape.
 *
 * Auto-scoped server-side via JWT (superadmin = all tenants, app-owner = own
 * apps, user = own records).
 */
export interface PayAnalyticsOverview {
  totalPayments: number
  completedPayments: number
  failedPayments: number
  refundedPayments: number
  activeSubscriptions: number
  /** Revenue split by currency (completed payments only). */
  revenueByCurrency: PayRevenueByCurrency[]
  /** MRR proxy split by currency (active subscriptions normalized to month). */
  mrrByCurrency: PayRevenueByCurrency[]
  /** Daily revenue trend for the last 30 days, in the primary currency. */
  revenueTrend: PayRevenueTrendPoint[]
  /** Top 5 apps by revenue (completed payments). */
  topAppsByRevenue: PayTopApp[]
}

export interface PayOverviewSectionTexts {
  title?: string
  subtitle?: string
  totalRevenue?: string
  totalPayments?: string
  completedPayments?: string
  failedPayments?: string
  refundedPayments?: string
  activeSubscriptions?: string
  mrr?: string
  revenueTrendTitle?: string
  revenueTrendDescription?: string
  revenueTrendEmpty?: string
  revenueSeriesLabel?: string
  topAppsTitle?: string
  topAppsDescription?: string
  topAppsEmpty?: string
  topAppsAppColumn?: string
  topAppsRevenueColumn?: string
  loadError?: string
  comingSoon?: string
  comingSoonDescription?: string
  retry?: string
}

// ===== PAYMENTS SECTION =====

export interface PayPaymentsSectionTexts {
  // Stats
  totalRevenue?: string
  totalPayments?: string
  completedPayments?: string
  failedPayments?: string

  // Filters
  allTypes?: string
  allStatuses?: string
  searchPlaceholder?: string

  // Payment types
  donation?: string
  purchase?: string
  subscription?: string
  invoice?: string
  testimonial?: string

  // Payment statuses
  completed?: string
  pending?: string
  failed?: string
  refunded?: string
  cancelled?: string

  // Table headers
  dateHeader?: string
  userHeader?: string
  typeHeader?: string
  amountHeader?: string
  statusHeader?: string
  actionsHeader?: string
  columnApp?: string

  // Actions
  refund?: string
  refundTitle?: string
  refundDescription?: string
  refundSuccess?: string
  refundError?: string

  // Test mode bulk
  refundAllCompleted?: string
  refundAllConfirm?: string
  refundAllSuccess?: string

  // Empty
  noPayments?: string

  // Dialog common
  confirm?: string
  cancel?: string
  loading?: string
  close?: string
  retry?: string
}

// ===== SUBSCRIPTIONS SECTION =====

export interface PaySubscriptionsSectionTexts {
  // Stats
  activeSubscriptions?: string
  mrr?: string

  // Table headers
  userHeader?: string
  planHeader?: string
  intervalHeader?: string
  amountHeader?: string
  statusHeader?: string
  startedHeader?: string
  actionsHeader?: string
  columnApp?: string

  // Statuses (shared with payments)
  completed?: string
  pending?: string
  failed?: string
  refunded?: string
  cancelled?: string

  // Intervals
  monthly?: string

  // Actions
  cancelSubscription?: string
  cancelSubscriptionTitle?: string
  cancelSubscriptionDescription?: string
  cancelSubscriptionSuccess?: string
  cancelSubscriptionError?: string

  // Test mode bulk
  cancelAllSubscriptions?: string
  cancelAllConfirm?: string
  cancelAllSuccess?: string

  // Empty
  noSubscriptions?: string

  // Dialog common
  confirm?: string
  cancel?: string
  loading?: string
  close?: string
  retry?: string
}

// ===== PLANS SECTION =====

export interface PayPlansSectionTexts {
  // Stats
  totalPlans?: string
  activePlans?: string

  // Table headers
  planNameHeader?: string
  planPriceHeader?: string
  planIntervalHeader?: string
  planFeaturesHeader?: string
  planTrialDays?: string
  statusHeader?: string
  actionsHeader?: string

  // Status badges (shared)
  active?: string
  inactive?: string

  // Actions
  createPlan?: string
  createPlanTitle?: string
  deletePlan?: string
  deletePlanTitle?: string
  deletePlanDescription?: string
  createPlanSuccess?: string
  createPlanError?: string
  deletePlanSuccess?: string
  deletePlanError?: string
  togglePlanSuccess?: string
  togglePlanError?: string

  // Form labels
  planName?: string
  planAppName?: string
  planDescription?: string
  planAmount?: string
  planCurrency?: string
  planInterval?: string
  planIntervalCount?: string
  planFeatures?: string
  planSortOrder?: string
  planIntervalMonth?: string
  planIntervalYear?: string

  // Form hints
  planAmountHint?: string
  planIntervalCountHint?: string
  planFeaturesHint?: string
  planTrialDaysHint?: string

  // Form sections
  required?: string
  optionalSection?: string

  // Empty
  noPlans?: string

  // Dialog common
  confirm?: string
  cancel?: string
  loading?: string
  close?: string
  retry?: string
  create?: string
}

// ===== PROMOS SECTION =====

export interface PayPromosSectionTexts {
  // Stats
  totalPromos?: string
  activePromos?: string
  totalUses?: string

  // Table headers
  codeHeader?: string
  discountHeader?: string
  durationHeader?: string
  usesHeader?: string
  expiryHeader?: string
  statusHeader?: string
  actionsHeader?: string

  // Status badges
  active?: string
  inactive?: string
  noExpiry?: string

  // Actions
  createPromo?: string
  createPromoTitle?: string
  deletePromo?: string
  deletePromoTitle?: string
  deletePromoDescription?: string
  createPromoSuccess?: string
  createPromoError?: string
  deletePromoSuccess?: string
  deletePromoError?: string
  togglePromoSuccess?: string
  togglePromoError?: string

  // Form labels
  promoCode?: string
  promoAppName?: string
  promoDiscountType?: string
  promoDiscountValue?: string
  promoCurrency?: string
  promoDuration?: string
  promoDurationInMonths?: string
  promoMaxUses?: string
  promoExpiryDate?: string
  promoDiscountPercent?: string
  promoDiscountFixed?: string
  promoDurationOnce?: string
  promoDurationRepeating?: string
  promoDurationForever?: string
  unlimitedHint?: string

  // Form hints
  promoDiscountTypeHintPercent?: string
  promoDiscountTypeHintFixed?: string
  promoDurationHintOnce?: string
  promoDurationHintRepeating?: string
  promoDurationHintForever?: string
  promoDiscountValueHintPercent?: string
  promoDiscountValueHintFixed?: string
  promoMaxUsesHint?: string

  // Form sections
  required?: string
  optionalSection?: string

  // Empty
  noPromos?: string

  // Dialog common
  confirm?: string
  cancel?: string
  loading?: string
  close?: string
  retry?: string
  create?: string
}
