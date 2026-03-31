import registerRouter, { registerRegistry } from './register.js'
import loginRouter, { loginRegistry } from './login.js'
import tokenRouter, { tokenRegistry } from './token.js'
import meRouter, { meRegistry } from './me.js'
import verifyRouter, { verifyRegistry } from './verify.js'
import loginCookieRouter, { loginCookieRegistry } from './login-cookie.js'
import logoutRouter, { logoutRegistry } from './logout.js'
import forgotPasswordRouter, { forgotPasswordRegistry } from './forgot-password.js'
import resetPasswordRouter, { resetPasswordRegistry } from './reset-password.js'
import verifyEmailRouter, { verifyEmailRegistry } from './verify-email.js'
import sendVerificationRouter, { sendVerificationRegistry } from './send-verification.js'

export const authRegistries = [
  registerRegistry,
  loginRegistry,
  tokenRegistry,
  meRegistry,
  verifyRegistry,
  loginCookieRegistry,
  logoutRegistry,
  forgotPasswordRegistry,
  resetPasswordRegistry,
  verifyEmailRegistry,
  sendVerificationRegistry,
]

export const authRouters = [
  registerRouter,
  loginRouter,
  tokenRouter,
  meRouter,
  verifyRouter,
  loginCookieRouter,
  logoutRouter,
  forgotPasswordRouter,
  resetPasswordRouter,
  verifyEmailRouter,
  sendVerificationRouter,
]
