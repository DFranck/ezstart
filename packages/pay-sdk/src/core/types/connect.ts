// Stripe Connect Types
export type ConnectAccountType = 'standard' | 'express'

export type ConnectAccountStatus = 'pending' | 'active' | 'restricted' | 'disabled'

export interface ConnectedAccount {
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
  createdAt: string
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
