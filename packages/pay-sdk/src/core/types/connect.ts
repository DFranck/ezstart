// Stripe Connect Types
export type ConnectAccountType = 'standard' | 'express'

export type ConnectAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled'

export interface ConnectedAccount {
  /**
   * Mongo `_id` string — exposed by the API layer when the row is serialized
   * via `.lean()`. Used by callers (e.g. `<ConnectStatusCard>` Resume button)
   * to address the row in `POST /api/connect/onboarding/resume`.
   */
  _id?: string
  /** Ezauth Application id this account belongs to (one account per app). */
  applicationId: string
  /**
   * `true` when this points at the shared platform (EZStart LLC) Stripe account
   * used by dogfood apps. `false` when the app has onboarded its own external
   * Stripe Connect account.
   */
  isPlatformAccount: boolean
  stripeAccountId: string
  email: string
  businessName: string
  accountType: ConnectAccountType
  status: ConnectAccountStatus
  chargesEnabled: boolean
  payoutsEnabled: boolean
  defaultFeePercent: number
  onboardedAt: string | null
  /**
   * Last time the user clicked "Resume Stripe onboarding" (cf.
   * `POST /api/connect/onboarding/resume`). `null` when never resumed.
   */
  lastResumedAt?: string | null
  createdAt: string
}

/** Body of `POST /api/connect/onboarding/resume`. */
export interface ConnectResumeRequest {
  connectedAccountId: string
  /**
   * Optional — user locale (e.g. `'en'`, `'fr'`) propagated to the
   * post-onboarding callback so the API redirects the user back to the
   * correct locale route in the EZPay web UI. Defaults to `'en'` server-side.
   */
  locale?: string
}

export interface ConnectResumeResponse {
  accountLinkUrl: string
  /** Milliseconds remaining before the pending row is auto-cleaned. */
  expiresInMs: number
}

export interface ConnectStatusResponse {
  connectedAccount: ConnectedAccount | null
}

export interface ConnectOnboardRequest {
  /** Required — the Application the new Connect account belongs to. */
  applicationId: string
  email: string
  businessName: string
  type: ConnectAccountType
  /**
   * Optional — user locale (e.g. `'en'`, `'fr'`) propagated to the
   * post-onboarding callback so the API redirects the user back to the
   * correct locale route in the EZPay web UI. Defaults to `'en'` server-side.
   */
  locale?: string
}

/**
 * Body accepted by `PATCH /api/connect/accounts/:applicationId` — superadmin-only
 * switchability between platform and external Stripe accounts.
 */
export interface ConnectConvertRequest {
  /** New Stripe account id (must start with `acct_`). */
  stripeAccountId: string
  /** `true` = platform dogfood account, `false` = external Connect account. */
  isPlatformAccount: boolean
}

export interface ConnectOnboardResponse {
  accountLinkUrl: string
  connectedAccount: ConnectedAccount
}

export interface ConnectDashboardLinkResponse {
  loginLinkUrl: string
  message?: string
}
