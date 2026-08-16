import type { AuthLocale } from '../../../i18n/index.js'
import type { OAuthProvider } from '../../OAuthButtons.js'

/**
 * User-facing strings consumed by `<SignUpForm>`. All keys ship localized
 * defaults via the `signUp` namespace; consumer overrides via the `texts`
 * prop take precedence.
 *
 * @internal
 */
export interface SignUpFormTexts {
  email: string
  emailPlaceholder: string
  emailTaken: string
  username: string
  usernamePlaceholder: string
  usernameTaken: string
  firstName: string
  firstNamePlaceholder: string
  lastName: string
  lastNamePlaceholder: string
  password: string
  passwordPlaceholder: string
  passwordHint: string
  confirmPassword: string
  confirmPasswordPlaceholder: string
  passwordMismatch: string
  submit: string
  submitting: string
  fallbackError: string
  /**
   * Shown when `apiCall` throws an `ApiError` with `code === 'NETWORK_UNAVAILABLE'`
   * (server unreachable: offline, DNS down, server crashed). Replaces the
   * raw browser `"Failed to fetch"` message which is non-actionable.
   */
  networkError: string
  // Success state
  checkEmail: string
  checkEmailDescription: string
  backToLogin: string
  // Password strength
  passwordWeak: string
  passwordFair: string
  passwordGood: string
  passwordStrong: string
  // Promo code
  promoCodeLabel: string
  promoCodePlaceholder: string
  promoCodeApplied: string
  promoCodeToggle: string
  promoCodeInvalid: string
  promoCodeRateLimited: string
  promoCodeChecking: string
  // OAuth texts (optional — only needed if showOAuth is true)
  continueWithGoogle?: string
  orContinueWith?: string
  // PasswordInput visibility toggle (sr-only)
  showPassword?: string
  hidePassword?: string
}

/** @internal */
export interface SignUpFormProps {
  /** App name for the register request */
  appName: string
  /** Pre-filled promo code (auto-detected from URL ?promo= or localStorage if not provided) */
  promoCode?: string
  /** Redirect URI after registration (OAuth code flow) */
  redirectUri?: string
  /** Called after successful registration */
  onSuccess?: () => void
  /** Called when user clicks "Back to login" after registration */
  onBackToLogin?: () => void
  /** Href for back to login link */
  backToLoginHref?: string
  /** Show OAuth buttons above the form */
  showOAuth?: boolean
  /** OAuth providers to display */
  oauthProviders?: OAuthProvider[]
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/register` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<SignUpFormTexts>
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
   * EZPay-compatible API base URL used to validate promo codes
   * (`?promo=` URL param or manually entered). When omitted, promo
   * validation is disabled entirely. Pass the same value the consumer
   * already uses for `<PayProvider apiUrl=...>`.
   *
   * @example 'https://pay.example.com'
   */
  promoApiUrl?: string
  /**
   * DOM `id` of the underlying `<form>` element. Used by `<SignUpModal>` to
   * render its primary submit button OUTSIDE the form (in the Modal footer
   * slot) via the standard HTML `<button form="...">` association.
   */
  formId?: string
  /**
   * Hide the in-form primary submit button. Used by `<SignUpModal>` so the
   * submit button can be rendered in the Modal footer instead. Secondary
   * controls (OAuth buttons, promo-code toggle) STAY visible.
   */
  hideSubmitButton?: boolean
  /**
   * Notified whenever the form's internal `loading` state flips. Lets a
   * parent (e.g. `<SignUpModal>`) wire its external submit button's spinner
   * + disabled state without owning the submission logic.
   */
  onSubmittingChange?: (isSubmitting: boolean) => void
  /**
   * Cloudflare Turnstile site key — when provided, renders a captcha widget
   * above the submit button and blocks submission until a token is obtained.
   * The token is sent as `body.turnstileToken` to the backend. When omitted
   * the widget is not rendered (no-op) and submission is unrestricted.
   */
  turnstileSiteKey?: string
}

/**
 * Internal react-hook-form field shape.
 *
 * @internal
 */
export interface SignUpFormData {
  email: string
  username: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  promoCode: string
}

/** @internal */
export const SIGN_UP_DEFAULT_FORM_ID = 'ezstart-signup-form'

/** @internal */
export const SIGN_UP_MIN_PASSWORD_LENGTH = 8
