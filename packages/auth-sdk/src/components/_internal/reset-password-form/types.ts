import type { AuthLocale } from '../../../i18n/index.js'

/**
 * User-facing strings consumed by `<ResetPasswordForm>`. Localized defaults
 * come from the `resetPassword` namespace; consumer overrides via `texts` win.
 *
 * @internal
 */
export interface ResetPasswordFormTexts {
  newPassword: string
  newPasswordPlaceholder: string
  confirmPassword: string
  confirmPasswordPlaceholder: string
  submit: string
  submitting: string
  required: string
  /** Message template with {min} placeholder, e.g. "Must be at least {min} characters" */
  minLength: string
  passwordMismatch: string
  invalidToken: string
  success: string
  tryAgain: string
  backToLogin: string
  fallbackError: string
  /**
   * Shown when `apiCall` throws an `ApiError` with `code === 'NETWORK_UNAVAILABLE'`
   * (server unreachable: offline, DNS down, server crashed). Replaces the
   * raw browser `"Failed to fetch"` message which is non-actionable.
   */
  networkError: string
  // Password strength
  passwordWeak: string
  passwordFair: string
  passwordGood: string
  passwordStrong: string
  // Pre-validation / token-expired states
  validating: string
  tokenExpired: string
  requestNewLink: string
  errorInvalidToken: string
  // PasswordInput visibility toggle (sr-only)
  showPassword?: string
  hidePassword?: string
}

/** @internal */
export interface ResetPasswordFormProps {
  /** Reset token from email link (required) */
  token: string | null | undefined
  /** Back to login href (defaults to useAuthNavigation().loginHref) */
  backHref?: string
  /** Forgot password href for "try again" link (defaults to useAuthNavigation().forgotPasswordHref) */
  forgotPasswordHref?: string
  /**
   * Href to request a new reset link (shown in "token expired" state).
   * Defaults to `forgotPasswordHref` / useAuthNavigation().forgotPasswordHref.
   */
  requestNewLinkHref?: string
  /**
   * Optional pre-validation hook. When provided AND a token is present, called on mount
   * to verify the token is still valid BEFORE showing the form.
   * Should resolve with `{ valid: boolean, code?: string }`.
   */
  onValidateToken?: (token: string) => Promise<{ valid: boolean; code?: string }>
  /** Called after success (if provided, overrides auto-redirect to login) */
  onSuccess?: () => void
  /** Auto-redirect to login after success (default: true, 3s delay) */
  autoRedirect?: boolean
  /**
   * Locale for embedded dictionaries (en | fr | vi). Defaults to the active
   * locale detected from the URL pathname (e.g. `/fr/reset-password` → `'fr'`).
   * Any keys provided in `texts` take precedence over the localized defaults.
   */
  locale?: AuthLocale | string
  /** Override texts (merged on top of the localized defaults). */
  texts?: Partial<ResetPasswordFormTexts>
  /**
   * DOM `id` of the underlying `<form>` element. Used by `<ResetPasswordModal>`
   * to render its primary submit button OUTSIDE the form (in the Modal footer
   * slot) via the standard HTML `<button form="...">` association.
   *
   * Note: only applied to the password-input form state. The intermediate
   * "validating" / "token expired" / "success" states still render their own
   * inline CTAs (those are navigation links, not form submissions).
   */
  formId?: string
  /**
   * Hide the in-form primary submit button. Used by `<ResetPasswordModal>` so
   * the submit button can be rendered in the Modal footer instead. Only
   * affects the password-input form state.
   */
  hideSubmitButton?: boolean
  /**
   * Notified whenever the form's internal `loading` state flips. Lets a
   * parent (e.g. `<ResetPasswordModal>`) wire its external submit button's
   * spinner + disabled state without owning the submission logic.
   */
  onSubmittingChange?: (isSubmitting: boolean) => void
  /**
   * Notified whenever the form transitions in/out of its submittable state
   * (token present + valid + not yet submitted). Lets a parent (e.g.
   * `<ResetPasswordModal>`) hide its external submit button when the form
   * is showing its own intermediate UI (validating, token-expired, success).
   */
  onSubmittableChange?: (isSubmittable: boolean) => void
}

/**
 * Internal react-hook-form field shape.
 *
 * @internal
 */
export interface ResetPasswordFormData {
  newPassword: string
  confirmPassword: string
}

/** Pre-validation lifecycle of the reset token. @internal */
export type ResetPasswordValidationState = 'idle' | 'validating' | 'valid' | 'invalid'

/** @internal */
export const RESET_PASSWORD_DEFAULT_FORM_ID = 'ezstart-reset-password-form'

/** @internal */
export const RESET_PASSWORD_MIN_LENGTH = 8

/** @internal */
export const RESET_PASSWORD_INVALID_TOKEN_CODE = 'INVALID_OR_EXPIRED_TOKEN'
