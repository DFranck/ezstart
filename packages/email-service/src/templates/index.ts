/**
 * Email templates — locale-aware, app-prefixed, override-friendly.
 *
 * New contract (breaking — call sites in `apps/ezauth/api/` must migrate):
 *   passwordResetTemplate({ resetUrl }, { appName, appKey, locale?, overrides? })
 *   emailVerificationTemplate({ verifyUrl }, ctx)
 *   welcomeSetPasswordTemplate({ setPasswordUrl, username, customMessage?, promoCode? }, ctx)
 *   accountDeletionTemplate({ username, email, scheduledHardDeleteAt, gracePeriodDays }, ctx)
 *
 * Each returns a `RenderedEmail` ({ subject, html, text, from?, replyTo? }).
 */

export { passwordResetTemplate } from './passwordReset.js'
export type { PasswordResetData } from './passwordReset.js'

export { emailVerificationTemplate } from './emailVerification.js'
export type { EmailVerificationData } from './emailVerification.js'

export { welcomeSetPasswordTemplate } from './welcomeSetPassword.js'
export type { WelcomeSetPasswordData } from './welcomeSetPassword.js'

export { accountDeletionTemplate } from './accountDeletion.js'
export type { AccountDeletionData } from './accountDeletion.js'

export { getLocaleDict } from './shared.js'
export type { LocaleDict } from './locales/en.js'
