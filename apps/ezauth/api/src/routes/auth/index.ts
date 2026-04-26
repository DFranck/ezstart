import registerRouter, { registerRegistry } from './register.js'
import loginRouter, { loginRegistry } from './login.js'
import tokenRouter, { tokenRegistry } from './token.js'
import meRouter, { meRegistry } from './me.js'
import verifyRouter, { verifyRegistry } from './verify.js'
import loginCookieRouter, { loginCookieRegistry } from './login-cookie.js'
import logoutRouter, { logoutRegistry } from './logout.js'
import refreshRouter, { refreshRegistry } from './refresh.js'
import sessionsRouter, { sessionsRegistry } from './sessions.js'
import forgotPasswordRouter, { forgotPasswordRegistry } from './forgot-password.js'
import resetPasswordRouter, { resetPasswordRegistry } from './reset-password.js'
import validateResetTokenRouter, { validateResetTokenRegistry } from './validate-reset-token.js'
import verifyEmailRouter, { verifyEmailRegistry } from './verify-email.js'
import sendVerificationRouter, { sendVerificationRegistry } from './send-verification.js'
import checkAvailabilityRouter, { checkAvailabilityRegistry } from './check-availability.js'
import { twoFactorRegistries, twoFactorRouters } from './two-factor/index.js'
import deleteAccountRouter, { deleteAccountRegistry } from './delete-account.js'
import updateProfileRouter, { updateProfileRegistry } from './update-profile.js'
import changePasswordRouter, { changePasswordRegistry } from './change-password.js'
import quickSignupRouter, { quickSignupRegistry } from './quick-signup.js'
import ssoAuthorizeRouter, { ssoAuthorizeRegistry } from './sso-authorize.js'
import ssoExchangeRouter, { ssoExchangeRegistry } from './sso-exchange.js'
import meOAuthProvidersRouter, { meOAuthProvidersRegistry } from './me-oauth-providers.js'
import auditLogRouter, { auditLogRegistry } from './audit-log.js'

export const authRegistries = [
  registerRegistry,
  loginRegistry,
  tokenRegistry,
  meRegistry,
  verifyRegistry,
  loginCookieRegistry,
  logoutRegistry,
  refreshRegistry,
  sessionsRegistry,
  forgotPasswordRegistry,
  resetPasswordRegistry,
  validateResetTokenRegistry,
  verifyEmailRegistry,
  sendVerificationRegistry,
  checkAvailabilityRegistry,
  ...twoFactorRegistries,
  deleteAccountRegistry,
  updateProfileRegistry,
  changePasswordRegistry,
  quickSignupRegistry,
  ssoAuthorizeRegistry,
  ssoExchangeRegistry,
  meOAuthProvidersRegistry,
  auditLogRegistry,
]

export const authRouters = [
  registerRouter,
  loginRouter,
  tokenRouter,
  meRouter,
  verifyRouter,
  loginCookieRouter,
  logoutRouter,
  refreshRouter,
  sessionsRouter,
  forgotPasswordRouter,
  resetPasswordRouter,
  validateResetTokenRouter,
  verifyEmailRouter,
  sendVerificationRouter,
  checkAvailabilityRouter,
  ...twoFactorRouters,
  deleteAccountRouter,
  updateProfileRouter,
  changePasswordRouter,
  quickSignupRouter,
  ssoAuthorizeRouter,
  ssoExchangeRouter,
  meOAuthProvidersRouter,
  auditLogRouter,
]
