import type { AuthLocale } from '../../../i18n/index.js'
import type { OAuthProvider } from '../../OAuthButtons.js'

/**
 * User-facing strings consumed by `<SignInForm>`. Localized defaults come
 * from the `signIn` namespace; consumer overrides via `texts` win.
 *
 * @internal
 */
export interface SignInFormTexts {
  emailOrUsername: string
  emailOrUsernamePlaceholder: string
  password: string
  passwordPlaceholder: string
  forgotPassword: string
  submit: string
  submitting: string
  required: string
  minLength: string
  noRedirectUri: string
  fallbackError: string
  /**
   * Shown when `apiCall` throws an `ApiError` with `code === 'NETWORK_UNAVAILABLE'`
   * (server unreachable: offline, DNS down, server crashed). Replaces the
   * raw browser `"Failed to fetch"` message which is non-actionable.
   */
  networkError: string
  // PasswordInput visibility toggle (sr-only)
  showPassword?: string
  hidePassword?: string
  // 2FA texts (optional — only needed if 2FA is enabled)
  twoFactorPrompt?: string
  twoFactorCodePlaceholder?: string
  twoFactorVerify?: string
  twoFactorVerifying?: string
  twoFactorBack?: string
  // OAuth texts (optional — only needed if showOAuth is true)
  continueWithGoogle?: string
  orContinueWith?: string
}

/** @internal */
export interface SignInFormProps {
  /** App name for the login request */
  appName: string
  /** Redirect URI after login (OAuth code flow) */
  redirectUri?: string
  /** Called after successful login (if not using redirect) */
  onSuccess?: () => void
  /** Called when user clicks "Forgot password" */
  onForgotPassword?: () => void
  /** Href for forgot password link (used if onForgotPassword is not provided) */
  forgotPasswordHref?: string
  /** Show OAuth buttons above the form */
  showOAuth?: boolean
  /** OAuth providers to display */
  oauthProviders?: OAuthProvider[]
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/login` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<SignInFormTexts>
  /**
   * When true, the form is rendered in preview mode: all inputs and submit
   * button are disabled with reduced opacity. Useful when the publishable
   * key is invalid — the form is visible but not usable.
   */
  disabled?: boolean
  /**
   * Key validation status for the DevModeBanner.
   * - `'valid'` — key was validated successfully
   * - `'invalid'` — key is invalid, revoked, or expired
   * - `'missing'` — no key provided
   */
  keyStatus?: 'valid' | 'invalid' | 'missing'
  /** Raw publishable key from URL (for DevModeBanner display). */
  urlKey?: string
  /**
   * DOM `id` of the underlying `<form>` element. Used by `<SignInModal>` to
   * render its primary submit button OUTSIDE the form (in the Modal footer
   * slot) via the standard HTML `<button form="...">` association. Defaults
   * to a stable internal id; pass an explicit value only when wiring an
   * external submit button yourself.
   */
  formId?: string
  /**
   * Hide the in-form primary submit button. Used by `<SignInModal>` so the
   * submit button can be rendered in the Modal footer instead. Secondary
   * controls (OAuth buttons, "Forgot password?" link) STAY visible.
   */
  hideSubmitButton?: boolean
  /**
   * Notified whenever the form's internal `loading` state flips. Lets a
   * parent (e.g. `<SignInModal>`) wire its external submit button's spinner
   * + disabled state without owning the submission logic.
   */
  onSubmittingChange?: (isSubmitting: boolean) => void
  /**
   * Cloudflare Turnstile site key — when provided, the form starts tracking
   * failed login attempts and renders a captcha widget once the user has
   * failed `turnstileShowAfterFails` times in a row (default 3). The token
   * is sent as `body.turnstileToken` to the backend on subsequent attempts.
   * When the key is empty, the widget is never shown (no-op).
   */
  turnstileSiteKey?: string
  /**
   * Number of consecutive failed login attempts before the captcha widget
   * is rendered. Only meaningful when `turnstileSiteKey` is provided.
   * Defaults to `3` — kept low to balance bot deterrence with user
   * friction on legitimate typos.
   */
  turnstileShowAfterFails?: number
}

/**
 * Internal react-hook-form field shape.
 *
 * @internal
 */
export interface SignInFormData {
  email: string
  password: string
}

/** @internal */
export const SIGN_IN_DEFAULT_FORM_ID = 'ezstart-signin-form'
