import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getAuthUserModel, AuthUserDocument } from '../models/auth-user.js'
import { getAuthCodeModel } from '../models/auth-code.js'
import {
  getRefreshTokenModel,
  hashRefreshToken,
  generateRawRefreshToken,
} from '../models/refresh-token.js'
import {
  LoginRequest,
  RegisterRequest,
  TokenRequest,
  AuthToken,
  AuthCodeResponse,
  JWTPayload,
} from '@ezstart/auth-sdk/server'
import { logger } from '@ezstart/logger/server'
import { mapToRecord } from '../utils/map-to-record.js'
import { JWT_SECRET, env } from '../config/env.js'
import { ACCESS_TOKEN_EXPIRES_SECONDS } from '../config/cookie.js'
import { JWT_ISSUER, JWT_VERIFIER_AUDIENCE, defaultSignAudience } from '../config/jwt.js'
import {
  LOCKOUT_DURATION_MS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  SLIDING_WINDOW_MS,
} from '../config/lockout.js'
import { AuditLogService } from './audit-log.service.js'
import { TotpService } from './totp.service.js'
import { assertPasswordStrength } from './password-policy.service.js'

const ACCESS_TOKEN_EXPIRES_IN = env.ACCESS_TOKEN_EXPIRES_IN as `${number}m`
const REFRESH_TOKEN_DAYS = 30

/**
 * MED-2 (Wave D Lot 3A) — constant dummy bcrypt hash used to equalize the
 * response time of credential checks when the identifier does NOT exist.
 *
 * Without this, a non-existent account returns immediately (no bcrypt work)
 * while an existing account incurs the ~hundreds-of-ms bcrypt compare. An
 * attacker measuring that timing delta can enumerate which emails/usernames
 * are registered. By running a throwaway `bcrypt.compare` against this hash
 * we burn the same CPU on the miss path as on the hit path.
 *
 * The hash is of a random throwaway password generated at authoring time — it
 * matches no real account and is never used to grant access. Cost factor 12
 * mirrors the `bcrypt.genSalt(12)` used by the AuthUser pre-save hook so the
 * compare takes the same wall-clock time as a real one.
 */
const DUMMY_BCRYPT_HASH = '$2a$12$pCBbNeZtb//laRE6gKE0muioZJWbgAnaZgPzeeh7hFhlPlxbCgKnG'

/**
 * Thrown when an account is currently locked due to too many failed login
 * attempts. Routes catch this specifically to return HTTP 423 Locked with a
 * machine-readable `code: 'ACCOUNT_LOCKED'` and the `lockedUntil` deadline so
 * clients can render an accurate countdown.
 */
export class AccountLockedError extends Error {
  readonly code = 'ACCOUNT_LOCKED' as const
  readonly lockedUntil: Date
  readonly retryAfterSeconds: number

  constructor(lockedUntil: Date) {
    const retryAfterSeconds = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 1000))
    const minutes = Math.ceil(retryAfterSeconds / 60)
    super(
      `Account temporarily locked due to too many failed login attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
    )
    this.name = 'AccountLockedError'
    this.lockedUntil = lockedUntil
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/**
 * Build the JWT payload for an authenticated user. Shared by login + SSO
 * exchange + refresh rotation + magic-link + OAuth + 2FA validate.
 *
 * `twoFactorEnabled` is sourced from the (separate) `TotpSecret` document
 * because the user collection itself does not carry the flag. Failure to
 * read the TOTP doc is treated as `false` (defensive default — a network
 * blip should not cause the consumer to over-grant elevated UI access).
 */
export async function buildJwtPayload(user: AuthUserDocument): Promise<JWTPayload> {
  const userId = user._id!.toString()
  let twoFactorEnabled = false
  try {
    twoFactorEnabled = await TotpService.isEnabled(userId)
  } catch (error: unknown) {
    // Defensive — log but never block JWT issuance on a TOTP read hiccup.
    // The middleware-side `requireTwoFactor()` is the security source of
    // truth; this claim is informational for SDK consumers (e.g. the
    // `<RequireTwoFactor>` guard) and falls back to `false` on read error.
    logger.warn(
      { err: error, userId },
      'buildJwtPayload: TOTP isEnabled lookup failed — defaulting to false'
    )
  }
  return {
    userId,
    email: user.email,
    username: user.username,
    apps: user.apps,
    globalRoles: user.globalRoles || [],
    appRoles: mapToRecord(user.appRoles),
    permissions: user.permissions || [],
    features: user.features || [],
    // JWT-ISVERIFIED-CLAIM-001 (2026-05-01) — embed verification status in the
    // token so consumer apps can gate verified-only features without a round
    // trip to /me. Optional on the SDK side for backward compat with legacy
    // tokens (default false on the consumer when absent).
    isVerified: user.isVerified === true,
    // 2FA_MANDATORY_ADMIN-001 (2026-05-01) — embed 2FA enrollment so
    // consumer apps (and the `<RequireTwoFactor>` SDK guard) can gate
    // elevated UI without an extra `/me` round trip. Optional on the SDK
    // side for backward compat (default false on the consumer when absent).
    twoFactorEnabled,
  }
}

/**
 * Issue a full session (signed JWT + hashed refresh token) for a given user.
 * Used by login, token exchange and SSO-exchange to remove duplication.
 */
export async function issueSession(
  user: AuthUserDocument,
  meta?: { userAgent?: string; ip?: string }
): Promise<AuthToken & { refreshToken: string }> {
  const payload = await buildJwtPayload(user)
  // HAC-CRIT-2 — stamp `iss` + `aud` so cross-API token replay is rejected
  // by every consumer's `jwt.verify({ issuer, audience })`. See
  // ../config/jwt.ts for the rationale.
  const accessToken = jwt.sign({ ...payload }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    algorithm: 'HS256',
    issuer: JWT_ISSUER,
    audience: defaultSignAudience(),
  })

  const refreshToken = await AuthService.generateRefreshToken(
    user._id!.toString(),
    meta?.userAgent,
    meta?.ip
  )

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_EXPIRES_SECONDS,
    // Surface `twoFactorEnabled` on the user object so SDK consumers see the
    // gate state immediately after login/refresh — without a follow-up `/me`
    // call. Mirrors `getUserById()` (cf. line ~401). The flag is already
    // computed in `buildJwtPayload()` above so we forward it for free.
    user: { ...user.toAuthUser(), twoFactorEnabled: payload.twoFactorEnabled === true },
    refreshToken,
  }
}

export class AuthService {
  // Register new user
  static async register(data: RegisterRequest): Promise<AuthCodeResponse> {
    const AuthUserModel = await getAuthUserModel()

    const normalizedEmail = data.email.trim().toLowerCase()
    const normalizedUsername = data.username.trim().toLowerCase()

    // Check if user already exists
    const existingUser = await AuthUserModel.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
    })

    if (existingUser) {
      throw new Error('User already exists with this email or username')
    }

    // MED-1 — server-side password strength gate (zxcvbn score >= 3 + HIBP
    // breach check). Runs AFTER the uniqueness check so we don't reveal
    // timing about existing accounts via the (heavier) strength check, and
    // BEFORE persisting so a weak/breached password is never hashed/stored.
    // Penalize passwords derived from the user's own identity.
    await assertPasswordStrength(data.password, [normalizedEmail, normalizedUsername])

    // Create new user
    const user = new AuthUserModel({
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash: data.password, // Will be hashed by pre-save hook
      firstName: data.firstName,
      lastName: data.lastName,
      apps: [data.app], // Grant access to the requesting app
      isVerified: false, // Requires email verification
      ...(data.promoCode ? { promoCode: data.promoCode } : {}),
      ...(data.utmSource ? { utmSource: data.utmSource } : {}),
    })

    try {
      await user.save()
    } catch (saveError: unknown) {
      // Handle MongoDB duplicate key error (race condition with concurrent signups)
      if (
        saveError instanceof Error &&
        'code' in saveError &&
        (saveError as { code: number }).code === 11000
      ) {
        throw new Error('User already exists with this email or username')
      }
      throw saveError
    }

    // Generate auth code
    return this.generateAuthCode(user._id!.toString(), data.app, data.redirect_uri)
  }

  /**
   * Validate user credentials without generating an auth code.
   * Used by the login route to check credentials before 2FA.
   * Returns the user ID on success.
   *
   * Enforces account-level brute force lockout: after
   * {@link MAX_FAILED_LOGIN_ATTEMPTS} consecutive wrong-password attempts on
   * the same account, the account is locked for {@link LOCKOUT_DURATION_MS}.
   * Locked accounts throw {@link AccountLockedError} which the route layer
   * maps to HTTP 423. Non-existent identifiers are NOT counted toward any
   * lockout — that would help attackers enumerate accounts.
   *
   * Optional `meta` (ip, userAgent) is forwarded to the audit log entry
   * written when the account locks.
   */
  static async validateCredentials(
    data: LoginRequest,
    meta?: { ip?: string | null; userAgent?: string | null }
  ): Promise<string> {
    const AuthUserModel = await getAuthUserModel()
    // `email` field accepts either an email or a username (both are normalized
    // to lowercase + trimmed at creation time).
    const identifier = data.email.trim().toLowerCase()
    const user = await AuthUserModel.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    })
    if (!user) {
      // MED-2 — run a throwaway bcrypt compare so the miss path costs the same
      // wall-clock time as the hit path. Without this, a non-existent account
      // returns instantly (no bcrypt) while a real account pays the bcrypt
      // cost → timing side-channel that lets attackers enumerate accounts.
      // Result is intentionally discarded.
      await bcrypt.compare(data.password, DUMMY_BCRYPT_HASH)
      // Do NOT count toward any account counter — would leak existence.
      throw new Error('Invalid credentials')
    }

    const now = new Date()

    // HIGH-2 (Wave D Lot 3.5A) — COMPARE-FIRST to kill the account-enumeration
    // oracle. The previous code checked `lockedUntil` BEFORE the bcrypt compare,
    // so a locked (hence existing) account returned 423 in ~0ms while a
    // non-existent identifier returned 401 after a full bcrypt — a reliable
    // binary existence oracle (lock 6 attempts, then read 423 vs 401).
    //
    // Now we ALWAYS run exactly one real bcrypt compare first (uniform timing,
    // single compare per attempt). The 423 "locked" signal is revealed ONLY
    // when the password is CORRECT — which an attacker cannot reach without the
    // credentials, so it can no longer be used to enumerate accounts.
    const isValidPassword = await user.comparePassword(data.password)

    if (!isValidPassword) {
      // Wrong password. Apply the lockout bookkeeping but ALWAYS return a
      // generic 401 — NEVER 423 here, even if THIS attempt just tripped the
      // lock. Surfacing 423 on a wrong-password attempt would re-open the
      // enumeration oracle (only existing accounts can lock).
      const last = user.lastFailedLoginAt
      const withinWindow =
        last instanceof Date && now.getTime() - last.getTime() < SLIDING_WINDOW_MS
      const previousAttempts = withinWindow ? (user.failedLoginAttempts ?? 0) : 0
      const newAttempts = previousAttempts + 1

      user.lastFailedLoginAt = now

      if (newAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
        // Lock the account. Reset the counter so the next window starts
        // fresh once the lockout expires (otherwise a single failure after
        // unlock would re-trigger the lock immediately).
        const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS)
        user.lockedUntil = lockedUntil
        user.failedLoginAttempts = 0
        await user.save()

        // Fire-and-forget audit log entry. Failure must NEVER block the
        // response. NOTE: we DON'T throw AccountLockedError here — a wrong
        // password always returns the generic 401 below. The lock takes effect
        // for the NEXT attempt that presents the correct password.
        void AuditLogService.create({
          userId: user._id!.toString(),
          action: 'account_locked_brute_force',
          metadata: {
            email: user.email,
            ip: meta?.ip ?? null,
            userAgent: meta?.userAgent ?? null,
            lockedUntil: lockedUntil.toISOString(),
            failedAttempts: MAX_FAILED_LOGIN_ATTEMPTS,
          },
        })
      } else {
        user.failedLoginAttempts = newAttempts
        await user.save()
      }

      // Generic 401 for every wrong-password path. The "no password set" hint
      // is intentionally only given on a wrong-password attempt for a
      // quick-signup account that exists; this matches the prior UX and does
      // not create a stronger oracle than already exists (a 401 either way) —
      // it merely helps a legitimate user who forgot they used Google sign-in.
      if (!user.hasSetOwnPassword) {
        throw new Error(
          "You haven't set a password yet. Use Google sign-in or click Forgot Password."
        )
      }
      throw new Error('Invalid credentials')
    }

    // Password is CORRECT. NOW — and only now — is it safe to reveal a lock,
    // because reaching this branch requires valid credentials.
    if (user.lockedUntil && user.lockedUntil.getTime() > now.getTime()) {
      throw new AccountLockedError(user.lockedUntil)
    }

    // Successful login — reset the lockout counter and clear any expired
    // lock so the next failure starts fresh.
    if (
      (user.failedLoginAttempts ?? 0) > 0 ||
      user.lockedUntil != null ||
      user.lastFailedLoginAt != null
    ) {
      user.failedLoginAttempts = 0
      user.lockedUntil = null
      user.lastFailedLoginAt = null
    }

    // Grant access to new app automatically in v1
    if (!user.apps.includes(data.app)) {
      user.apps.push(data.app)
    }

    if (user.isModified()) {
      await user.save()
    }

    return user._id!.toString()
  }

  // Login user
  static async login(data: LoginRequest): Promise<AuthCodeResponse> {
    const userId = await this.validateCredentials(data)
    return this.generateAuthCode(userId, data.app, data.redirect_uri)
  }

  // ✅ NEW: Login with direct token (httpOnly cookie mode)
  static async loginWithToken(
    data: LoginRequest,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<AuthToken & { refreshToken: string }> {
    // HIGH-2 (Wave D Lot 3.5A) — delegate to `validateCredentials` so the
    // cookie-login path shares the EXACT hardened logic: one constant-time
    // bcrypt compare (compare-first), the same brute-force lockout bookkeeping,
    // and the same enumeration-safe error surface (generic 401 on wrong
    // password, `AccountLockedError`/423 ONLY when the correct password is
    // presented on a locked account). Previously this method ran its own
    // unguarded compare with no lockout and no compare-first ordering — a
    // second, weaker code path that re-opened the timing/lock oracle.
    const userId = await this.validateCredentials(data, {
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    })

    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(userId)
    if (!user) {
      // Should be unreachable — validateCredentials just resolved this id.
      throw new Error('Invalid credentials')
    }

    // `validateCredentials` already grants app access + persists on success,
    // so the app membership is guaranteed here; no extra save needed.
    return issueSession(user, meta)
  }

  // Exchange code for token
  static async exchangeCodeForToken(
    data: TokenRequest,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<AuthToken & { refreshToken: string }> {
    const AuthCodeModel = await getAuthCodeModel()
    const AuthUserModel = await getAuthUserModel()
    logger.debug(
      { code: data.code, app: data.app, redirect_uri: data.redirect_uri },
      'Looking for auth code'
    )

    // Find and validate auth code
    const authCode = await AuthCodeModel.findOne({
      code: data.code,
      app: data.app,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    })

    logger.debug({ found: !!authCode, app: data.app }, 'Auth code lookup result')

    if (!authCode) {
      logger.debug({ app: data.app }, 'No valid auth code found')
      throw new Error('Invalid or expired authorization code')
    }

    // HAC-HIGH-4 (RFC 6749 §4.1.3) — "if the `redirect_uri` parameter was
    // included in the initial authorization request […] and if included
    // ensure that their values are identical." When the auth code was issued
    // with a `redirectUri`, the /token request MUST present the SAME value.
    // Exact-match — no normalization, same rationale as
    // `validateRedirectUri()`. Stops authcode-injection attacks where an
    // attacker intercepts a legitimate code and tries to redeem it on a
    // different `redirect_uri` they control.
    if (authCode.redirectUri) {
      if (data.redirect_uri !== authCode.redirectUri) {
        logger.warn(
          {
            app: data.app,
            issuedRedirectUri: authCode.redirectUri,
            presentedRedirectUri: data.redirect_uri ?? null,
          },
          '[OAuth] /token redirect_uri mismatch — possible authcode injection attempt'
        )
        throw new Error('Invalid or expired authorization code')
      }
    } else if (data.redirect_uri) {
      // Inverse case: the code was minted WITHOUT a redirect_uri (legacy /login
      // or magic-link flow), but the client sends one anyway. RFC 6749 §4.1.3
      // forbids this asymmetry. Reject so attackers cannot turn a no-redirect
      // code into a redirect-bearing one.
      logger.warn(
        { app: data.app, presentedRedirectUri: data.redirect_uri },
        '[OAuth] /token presented redirect_uri but auth code was issued without one'
      )
      throw new Error('Invalid or expired authorization code')
    }

    // Mark code as used
    authCode.isUsed = true
    await authCode.save()

    // Get user
    const user = await AuthUserModel.findById(authCode.userId)
    if (!user) {
      throw new Error('User not found')
    }

    return issueSession(user, meta)
  }

  // Verify JWT token
  static async verifyToken(token: string): Promise<JWTPayload> {
    try {
      // HAC-CRIT-2 — enforce iss/aud so tokens minted for another @ezstart
      // app (or by an attacker bypassing the sign path) are rejected here.
      const payload = jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        issuer: JWT_ISSUER,
        audience: JWT_VERIFIER_AUDIENCE,
      }) as JWTPayload
      return payload
    } catch {
      throw new Error('Invalid token')
    }
  }

  // Get user by ID
  static async getUserById(userId: string) {
    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }
    const base = user.toAuthUser()
    // 2FA_MANDATORY_ADMIN-001 — surface enrollment status on the AuthUser
    // payload so the SDK guard `<RequireTwoFactor>` can read it without a
    // dedicated round trip. Defensive default `false` on lookup error so
    // the consumer always gates instead of accidentally rendering admin UI.
    let twoFactorEnabled = false
    try {
      twoFactorEnabled = await TotpService.isEnabled(userId)
    } catch (error: unknown) {
      logger.warn(
        { err: error, userId },
        'getUserById: TOTP isEnabled lookup failed — defaulting to false'
      )
    }
    return { ...base, twoFactorEnabled }
  }

  /**
   * Public wrapper for generating auth codes (used by 2FA validate route)
   */
  static async generateAuthCodePublic(
    userId: string,
    app: string,
    redirectUri?: string
  ): Promise<AuthCodeResponse> {
    return this.generateAuthCode(userId, app, redirectUri)
  }

  // Private: Generate auth code
  private static async generateAuthCode(
    userId: string,
    app: string,
    redirectUri?: string
  ): Promise<AuthCodeResponse> {
    const AuthCodeModel = await getAuthCodeModel()
    const code = crypto.randomBytes(32).toString('hex')

    const authCode = new AuthCodeModel({
      code,
      userId,
      app,
      redirectUri,
    })

    await authCode.save()

    return {
      code,
      expires_at: authCode.expiresAt.toISOString(),
    }
  }

  // Check if user has access to app
  static async checkAppAccess(userId: string, app: string): Promise<boolean> {
    const AuthUserModel = await getAuthUserModel()
    const user = await AuthUserModel.findById(userId)
    return user ? user.apps.includes(app) : false
  }

  // --- Refresh Token Management ---

  /**
   * Create and store a refresh token for a user.
   * Returns the raw (unhashed) token to send to the client.
   */
  static async generateRefreshToken(
    userId: string,
    userAgent?: string,
    ip?: string
  ): Promise<string> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const rawToken = generateRawRefreshToken()
    const tokenHash = hashRefreshToken(rawToken)

    await RefreshTokenModel.create({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000),
      userAgent,
      ip,
    })

    return rawToken
  }

  /**
   * Validate a refresh token, rotate it (revoke old, create new), and return
   * new access + refresh tokens.
   */
  static async refreshAccessToken(
    rawRefreshToken: string,
    meta?: { userAgent?: string; ip?: string }
  ): Promise<AuthToken & { refreshToken: string }> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const AuthUserModel = await getAuthUserModel()
    const tokenHash = hashRefreshToken(rawRefreshToken)

    // Find the stored token
    const storedToken = await RefreshTokenModel.findOne({ tokenHash })

    if (!storedToken) {
      throw new Error('Invalid refresh token')
    }

    if (storedToken.isRevoked) {
      // Possible token reuse attack — revoke ALL tokens for this user
      logger.warn(
        { userId: storedToken.userId.toString() },
        'Revoked refresh token reuse detected — revoking all user tokens'
      )
      await RefreshTokenModel.updateMany(
        { userId: storedToken.userId },
        { $set: { isRevoked: true } }
      )
      throw new Error('Refresh token has been revoked')
    }

    if (storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token has expired')
    }

    // Revoke the old token (rotation)
    storedToken.isRevoked = true
    await storedToken.save()

    // Get user
    const user = await AuthUserModel.findById(storedToken.userId)
    if (!user) {
      throw new Error('User not found')
    }

    return issueSession(user, {
      userAgent: meta?.userAgent || storedToken.userAgent,
      ip: meta?.ip || storedToken.ip,
    })
  }

  /**
   * Revoke a specific refresh token by its document ID.
   */
  static async revokeRefreshToken(tokenId: string, userId: string): Promise<void> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const token = await RefreshTokenModel.findOne({ _id: tokenId, userId })

    if (!token) {
      throw new Error('Session not found')
    }

    token.isRevoked = true
    await token.save()
  }

  /**
   * Revoke all refresh tokens for a user (logout everywhere).
   */
  static async revokeAllUserTokens(userId: string): Promise<number> {
    const RefreshTokenModel = await getRefreshTokenModel()
    const result = await RefreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true } }
    )
    return result.modifiedCount
  }

  /**
   * Get all active (non-revoked, non-expired) sessions for a user.
   */
  static async getUserSessions(userId: string, currentTokenHash?: string) {
    const RefreshTokenModel = await getRefreshTokenModel()
    const sessions = await RefreshTokenModel.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .select('_id userAgent ip createdAt expiresAt tokenHash')
      .lean()

    return sessions.map(s => ({
      id: s._id.toString(),
      userAgent: s.userAgent || null,
      ip: s.ip || null,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      isCurrent: currentTokenHash ? s.tokenHash === currentTokenHash : false,
    }))
  }
}
