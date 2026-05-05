import type { Request, Response } from 'express'
import {
  createRouterWithDoc,
  createStrictRateLimiter,
  OpenAPIRegistry,
  Router,
  sendError,
  sendSuccess,
  sendValidationError,
} from '@ezstart/api-core'
import { Router as ExpressRouter } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { errorResponseSchema } from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { getAuthUserModel } from '../../models/auth-user.js'
import { getMagicLinkRequestModel } from '../../models/magic-link-request.js'
import { issueSession } from '../../services/auth.service.js'
import { emailService } from '../../services/email.service.js'
import { AuditLogService } from '../../services/audit-log.service.js'
import { resolveUserLocale } from '../../utils/locale.js'
import { getAppDisplayName } from '../../utils/app-display.js'
import { getWebUrl } from '@ezstart/config/urls'
import { magicLinkTemplate } from '../../email/templates/magic-link.js'
import {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  buildAuthCookieOptions,
  buildRefreshCookieOptions,
} from '../../config/cookie.js'

export const magicLinkRegistry = new OpenAPIRegistry()
const router: ExpressRouter = Router()
const docRouter = createRouterWithDoc(magicLinkRegistry, router)

/** Magic link TTL — 15 min, matches the model default. */
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000

/** Anti-enumeration: never differentiate "user exists" from "user does not". */
const GENERIC_RESPONSE = {
  message: 'If an account exists, a sign-in link has been sent',
}

const APP_ENUM = [
  'ezbill',
  'ezauth',
  'admin',
  'ezstart',
  'green-pulse',
  'fengshui',
  'asc-tcd',
  'gacha-analyzer',
  'ezpay',
] as const

const requestMagicLinkSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(254)
    .email('Invalid email address')
    .describe('Email address to send the sign-in link to'),
  app: z.enum(APP_ENUM).optional().describe('App context for session issuance'),
  redirect_uri: z.string().url().optional().describe('Where to redirect after successful sign-in'),
  locale: z.enum(['en', 'fr', 'vi']).optional().describe('Preferred locale for the email'),
})

const requestMagicLinkResponseSchema = z.object({
  message: z.string().describe('Generic anti-enumeration response'),
})

const verifyMagicLinkQuerySchema = z.object({
  token: z.string().min(1, 'Token is required').describe('Magic link verification token'),
})

const verifyMagicLinkResponseSchema = z.object({
  message: z.string().describe('Sign-in confirmation'),
  user: z.object({
    _id: z.string(),
    email: z.string(),
    username: z.string(),
  }),
  redirectTo: z.string().describe('URL the client should navigate to after sign-in'),
})

// ─── POST /magic-link/request ─────────────────────────────────────────────────

const requestMagicLinkController = async (req: Request, res: Response) => {
  const parsed = requestMagicLinkSchema.safeParse(req.body)
  if (!parsed.success) {
    return sendValidationError(res, 'Invalid request', parsed.error.issues)
  }

  const { email, app: appKey, redirect_uri: redirectUri, locale: bodyLocale } = parsed.data
  const resolvedApp = appKey || 'ezauth'

  try {
    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findOne({ email })

    // Anti-enumeration: always return the same generic 200 response.
    // Only do the side-effect (DB write + email send) when the user exists.
    if (!user) {
      logger.debug({ email }, 'Magic link requested for non-existent email')
      return sendSuccess(res, GENERIC_RESPONSE)
    }

    const MagicLinkRequest = await getMagicLinkRequestModel()
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS)

    // Invalidate prior pending links for this user — only one active link
    // at a time prevents simultaneous click-races.
    await MagicLinkRequest.updateMany(
      { userId: user._id!.toString(), isUsed: false },
      { $set: { isUsed: true, consumedAt: new Date() } }
    )

    const ua = req.headers['user-agent']
    await MagicLinkRequest.create({
      userId: user._id!.toString(),
      email: user.email,
      app: resolvedApp,
      ...(redirectUri ? { redirectUri } : {}),
      token,
      expiresAt,
      issuedFromIp: req.ip,
      issuedUa: typeof ua === 'string' ? ua : undefined,
    })

    const locale = resolveUserLocale(req, bodyLocale)
    const appDisplayName = getAppDisplayName(resolvedApp)
    const signInUrl = `${getWebUrl('ezauth')}/${locale}/magic-link/verify?token=${encodeURIComponent(token)}`

    const rendered = magicLinkTemplate(
      { signInUrl },
      { appName: appDisplayName, appKey: resolvedApp, locale }
    )

    try {
      await emailService.send({
        to: user.email,
        from: `${appDisplayName} <noreply@ezstart.xyz>`,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      })
      logger.info(
        { userId: user._id!.toString(), email: user.email, app: resolvedApp },
        'Magic link email sent'
      )
    } catch (sendErr) {
      // Do not leak the failure to the caller (anti-enumeration). Log it.
      logger.error('Failed to send magic-link email:', sendErr)
    }

    void AuditLogService.createFromRequest(req, {
      userId: user._id!.toString(),
      action: 'magic_link_requested',
      metadata: { email: user.email, app: resolvedApp, expiresAt: expiresAt.toISOString() },
    })

    return sendSuccess(res, GENERIC_RESPONSE)
  } catch (error) {
    logger.error('Magic link request error:', error)
    // Still return generic to avoid leaking errors as enumeration signals.
    return sendSuccess(res, GENERIC_RESPONSE)
  }
}

// ─── GET /magic-link/verify ───────────────────────────────────────────────────

const verifyMagicLinkController = async (req: Request, res: Response) => {
  const parsed = verifyMagicLinkQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return sendValidationError(res, 'Invalid token', parsed.error.issues)
  }

  const { token } = parsed.data

  try {
    const MagicLinkRequest = await getMagicLinkRequestModel()
    const request = await MagicLinkRequest.findOne({
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    if (!request) {
      return sendError(res, 'Invalid or expired sign-in link', 400, {
        code: 'INVALID_OR_EXPIRED_TOKEN',
      })
    }

    const AuthUser = await getAuthUserModel()
    const user = await AuthUser.findById(request.userId)
    if (!user) {
      return sendError(res, 'User not found', 404)
    }

    // Mark consumed FIRST to prevent race conditions on parallel clicks.
    request.isUsed = true
    request.consumedAt = new Date()
    await request.save()

    // Grant access to the requesting app if this is the user's first session there.
    if (!user.apps.includes(request.app)) {
      user.apps.push(request.app)
      await user.save()
    }

    // Mark verified — magic-link click proves email control.
    if (!user.isVerified) {
      user.isVerified = true
      await user.save()
    }

    // Issue session via cookies (same shape as login-cookie).
    const ua = req.headers['user-agent']
    const session = await issueSession(user, {
      userAgent: typeof ua === 'string' ? ua : undefined,
      ip: req.ip,
    })

    res.cookie(ACCESS_COOKIE_NAME, session.access_token, buildAuthCookieOptions(req))
    res.cookie(REFRESH_COOKIE_NAME, session.refreshToken, buildRefreshCookieOptions(req))

    void AuditLogService.createFromRequest(req, {
      userId: user._id!.toString(),
      action: 'magic_link_login',
      metadata: { email: user.email, app: request.app },
    })

    // Resolve where to send the user post-sign-in.
    // Priority: explicit `redirectUri` from the original request > app dashboard > /
    const locale = resolveUserLocale(req)
    const redirectTo = request.redirectUri ?? `${getWebUrl('ezauth')}/${locale}/dashboard`

    logger.info(
      { userId: user._id!.toString(), email: user.email, app: request.app },
      'Magic link sign-in succeeded'
    )

    return sendSuccess(res, {
      message: 'Signed in',
      user: { _id: user._id!.toString(), email: user.email, username: user.username },
      redirectTo,
    })
  } catch (error) {
    logger.error('Magic link verify error:', error)
    return sendError(res, 'Failed to verify sign-in link', 500)
  }
}

// Magic link request — preset `strict` (5 req/min) limits per-IP. We rely on
// the route to also be idempotent: a second request invalidates the first.
docRouter.post('/magic-link/request', createStrictRateLimiter(), requestMagicLinkController, {
  summary: 'Request a passwordless sign-in link by email',
  tags: ['Authentication'],
  bodySchema: requestMagicLinkSchema,
  responseSchema: requestMagicLinkResponseSchema,
  extraResponses: {
    400: { description: 'Invalid email or request body', schema: errorResponseSchema },
    429: { description: 'Too many attempts', schema: errorResponseSchema },
  },
})

docRouter.get('/magic-link/verify', createStrictRateLimiter(), verifyMagicLinkController, {
  summary: 'Verify a magic-link token and issue a session',
  tags: ['Authentication'],
  responseSchema: verifyMagicLinkResponseSchema,
  extraResponses: {
    400: { description: 'Invalid or expired token', schema: errorResponseSchema },
    404: { description: 'User not found', schema: errorResponseSchema },
    500: { description: 'Server error', schema: errorResponseSchema },
  },
})

export default router
