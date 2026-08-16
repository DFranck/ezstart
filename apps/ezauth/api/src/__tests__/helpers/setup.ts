/**
 * Shared test helpers for ezauth API tests.
 *
 * Provides factory functions to create users, generate JWT tokens, and
 * build common request payloads used across the test suite.
 */

import jwt from 'jsonwebtoken'
import { getAuthUserModel, type AuthUserDocument } from '../../models/auth-user.js'
import { getAuthCodeModel } from '../../models/auth-code.js'
import { getOAuthAccountModel } from '../../models/oauth-account.js'
import {
  getRefreshTokenModel,
  hashRefreshToken,
  generateRawRefreshToken,
} from '../../models/refresh-token.js'
import { getApiKeyModel } from '../../models/api-key.js'
import { getApiKeyUsageModel } from '../../models/api-key-usage.js'
import { getTotpSecretModel } from '../../models/totp-secret.js'
import { hashApiKey, generateRawApiKey, extractKeyPrefix } from '../../utils/api-key.js'
import type { ApiKeyType, ApiKeyEnv } from '../../utils/api-key.js'
import type { ApiKeyScope } from '../../models/api-key.js'

// JWT_SECRET mirrors config/env.ts test fallback
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-do-not-use-in-prod'

// HAC-CRIT-2 — fixtures must mint tokens with the same iss/aud claims
// production code emits, otherwise `jwt.verify` on the routes side would
// reject them as 401 (audience invalid / invalid issuer). Kept as plain
// string literals here so the helper has zero import on app source.
const TEST_JWT_ISSUER = 'ezauth'
const TEST_JWT_AUDIENCE = ['ezauth', 'ezpay', 'ezbill', 'green-pulse']

export interface CreateUserOptions {
  email?: string
  username?: string
  password?: string
  isVerified?: boolean
  hasSetOwnPassword?: boolean
  apps?: string[]
  globalRoles?: string[]
  appRoles?: Record<string, string[]>
  promoCode?: string
  firstName?: string
  lastName?: string
}

/**
 * Create a user directly in the DB. Returns the saved document.
 * The passwordHash pre-save hook will bcrypt the password automatically.
 */
export async function createUser(opts: CreateUserOptions = {}): Promise<AuthUserDocument> {
  const AuthUser = await getAuthUserModel()
  const user = new AuthUser({
    email: opts.email ?? 'test@example.com',
    username: opts.username ?? 'testuser',
    passwordHash: opts.password ?? 'Password123!',
    isVerified: opts.isVerified ?? true,
    hasSetOwnPassword: opts.hasSetOwnPassword ?? true,
    apps: opts.apps ?? ['ezstart'],
    globalRoles: opts.globalRoles ?? [],
    firstName: opts.firstName,
    lastName: opts.lastName,
    promoCode: opts.promoCode,
  })

  // Set appRoles via Map if provided
  if (opts.appRoles) {
    const map = new Map<string, string[]>()
    Object.entries(opts.appRoles).forEach(([app, roles]) => {
      map.set(app, roles)
    })
    user.appRoles = map
  }

  await user.save()
  return user
}

/**
 * Create a quickSignup "ghost" user — unverified, no own password.
 */
export async function createQuickSignupUser(
  opts: Partial<CreateUserOptions> = {}
): Promise<AuthUserDocument> {
  return createUser({
    email: opts.email ?? 'ghost@example.com',
    username: opts.username ?? 'ghostuser',
    password: opts.password ?? 'RandomUUID-placeholder',
    isVerified: false,
    hasSetOwnPassword: false,
    apps: opts.apps ?? ['ezstart'],
    ...opts,
  })
}

/**
 * Force-enable 2FA on a user. Used by test helpers to satisfy the new
 * `requireTwoFactor()` middleware applied to every `/api/admin/*` route
 * (cf. 2FA_MANDATORY_ADMIN-001, 2026-05-01).
 *
 * Tests that need to assert the un-enrolled-admin code path can pass
 * `withTwoFactor: false` to `createAdminUser` / `createAppAdmin` to skip
 * this step.
 */
export async function enableTwoFactorForUser(userId: string): Promise<void> {
  const TotpSecretModel = await getTotpSecretModel()
  await TotpSecretModel.findOneAndUpdate(
    { userId },
    {
      $set: {
        userId,
        secret: 'TEST-SECRET-DO-NOT-USE-IN-PROD',
        isEnabled: true,
        backupCodes: [],
        lastUsedTotpStep: null,
      },
    },
    { upsert: true, new: true }
  )
}

/**
 * Create an admin user (superadmin). Auto-enrolls 2FA so the new
 * `requireTwoFactor()` middleware on `/api/admin/*` routes does not block
 * the user. Pass `withTwoFactor: false` to skip enrollment when testing
 * the un-enrolled code path.
 */
export async function createAdminUser(
  opts: Partial<CreateUserOptions> & { withTwoFactor?: boolean } = {}
): Promise<AuthUserDocument> {
  const { withTwoFactor = true, ...createOpts } = opts
  const user = await createUser({
    email: createOpts.email ?? 'admin@example.com',
    username: createOpts.username ?? 'adminuser',
    globalRoles: ['superadmin'],
    ...createOpts,
  })
  if (withTwoFactor) {
    await enableTwoFactorForUser(user._id!.toString())
  }
  return user
}

/**
 * Create an app-level admin (e.g., admin for green-pulse but not superadmin).
 * Auto-enrolls 2FA — see `createAdminUser` for the rationale.
 */
export async function createAppAdmin(
  app: string,
  opts: Partial<CreateUserOptions> & { withTwoFactor?: boolean } = {}
): Promise<AuthUserDocument> {
  const { withTwoFactor = true, ...createOpts } = opts
  const user = await createUser({
    email: createOpts.email ?? 'appadmin@example.com',
    username: createOpts.username ?? 'appadmin',
    appRoles: { [app]: ['admin'] },
    apps: [app],
    ...createOpts,
  })
  if (withTwoFactor) {
    await enableTwoFactorForUser(user._id!.toString())
  }
  return user
}

/**
 * Generate a valid JWT access token for the given user.
 *
 * Mirrors the shape returned by `buildJwtPayload()` in `auth.service.ts`,
 * including the `isVerified` claim (JWT-ISVERIFIED-CLAIM-001) and the
 * `twoFactorEnabled` claim (2FA_MANDATORY_ADMIN-001).
 *
 * Pass `twoFactorEnabled: true` when minting tokens for admin users in
 * tests that exercise the new 2FA gate — defaults to `false` so non-admin
 * paths keep working as before.
 */
export function generateAccessToken(
  user: AuthUserDocument,
  expiresIn: `${number}${'s' | 'm' | 'h' | 'd'}` = '15m',
  opts: { twoFactorEnabled?: boolean } = {}
): string {
  return jwt.sign(
    {
      userId: user._id!.toString(),
      email: user.email,
      username: user.username,
      apps: user.apps,
      globalRoles: user.globalRoles || [],
      appRoles: {},
      permissions: user.permissions || [],
      features: user.features || [],
      isVerified: user.isVerified === true,
      twoFactorEnabled: opts.twoFactorEnabled === true,
    },
    JWT_SECRET,
    {
      expiresIn,
      algorithm: 'HS256',
      issuer: TEST_JWT_ISSUER,
      audience: TEST_JWT_AUDIENCE,
    }
  )
}

/**
 * Generate an expired JWT token.
 */
export function generateExpiredToken(user: AuthUserDocument): string {
  return jwt.sign(
    {
      userId: user._id!.toString(),
      email: user.email,
      username: user.username,
      apps: user.apps,
      globalRoles: user.globalRoles || [],
      appRoles: {},
      permissions: [],
      features: [],
      isVerified: user.isVerified === true,
      twoFactorEnabled: false,
    },
    JWT_SECRET,
    {
      expiresIn: 0,
      algorithm: 'HS256',
      issuer: TEST_JWT_ISSUER,
      audience: TEST_JWT_AUDIENCE,
    }
  )
}

/**
 * Create an auth code in DB (for token exchange tests).
 */
export async function createAuthCode(
  userId: string,
  app = 'ezstart',
  opts: Record<string, unknown> = {}
) {
  const AuthCode = await getAuthCodeModel()
  const code = `test-code-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return AuthCode.create({
    code,
    userId,
    app,
    type: 'auth',
    expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    isUsed: false,
    ...opts,
  })
}

/**
 * Create a password reset code in DB.
 */
export async function createPasswordResetCode(userId: string, app = 'ezstart') {
  const AuthCode = await getAuthCodeModel()
  const code = `reset-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return AuthCode.create({
    code,
    userId,
    app,
    type: 'password-reset',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    isUsed: false,
  })
}

/**
 * Create an email verification code in DB.
 */
export async function createEmailVerificationCode(userId: string, app = 'ezstart') {
  const AuthCode = await getAuthCodeModel()
  const code = `verify-${Date.now()}-${Math.random().toString(36).slice(2)}`
  return AuthCode.create({
    code,
    userId,
    app,
    type: 'email-verification',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    isUsed: false,
  })
}

/**
 * Create a refresh token in DB for a user, returning both raw token and doc.
 */
export async function createRefreshToken(userId: string) {
  const RefreshToken = await getRefreshTokenModel()
  const rawToken = generateRawRefreshToken()
  const tokenHash = hashRefreshToken(rawToken)

  const doc = await RefreshToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isRevoked: false,
  })

  return { rawToken, tokenHash, doc }
}

/**
 * Create an API key in DB, returning both raw key and doc.
 *
 * Accepts the modern `type`/`env`/`scope` tuple. For backwards compatibility
 * with older test call sites, a legacy `scope` of `'test' | 'live' | 'admin'`
 * is mapped to the equivalent modern format.
 */
export async function createApiKey(userId: string, opts: Record<string, unknown> = {}) {
  const ApiKey = await getApiKeyModel()

  const rawScope = (opts.scope as ApiKeyScope | 'test' | 'live' | 'admin' | undefined) ?? 'user'

  // Map legacy scope values → (type, env, scope) triple.
  // Legacy 'test'  → publishable/test, scope='user'
  // Legacy 'live'  → publishable/live, scope='user'
  // Legacy 'admin' → secret/live,      scope='admin'
  let type: ApiKeyType = (opts.type as ApiKeyType | undefined) ?? 'publishable'
  let env: ApiKeyEnv = (opts.env as ApiKeyEnv | undefined) ?? 'live'
  let scope: ApiKeyScope = 'user'

  if (rawScope === 'test') {
    type = (opts.type as ApiKeyType | undefined) ?? 'publishable'
    env = (opts.env as ApiKeyEnv | undefined) ?? 'test'
    scope = 'user'
  } else if (rawScope === 'live') {
    type = (opts.type as ApiKeyType | undefined) ?? 'publishable'
    env = (opts.env as ApiKeyEnv | undefined) ?? 'live'
    scope = 'user'
  } else if (rawScope === 'admin') {
    type = (opts.type as ApiKeyType | undefined) ?? 'secret'
    env = (opts.env as ApiKeyEnv | undefined) ?? 'live'
    scope = 'admin'
  } else {
    scope = rawScope as ApiKeyScope
  }

  const rawKey = generateRawApiKey({ type, env })
  const hashedKey = hashApiKey(rawKey)
  const keyPrefix = extractKeyPrefix(rawKey)

  const doc = await ApiKey.create({
    key: hashedKey,
    keyPrefix,
    name: opts.name ?? 'Test Key',
    userId,
    appName: opts.appName ?? '*',
    type,
    env,
    scope,
    permissions: opts.permissions ?? ['*'],
    status: opts.status ?? 'active',
    expiresAt: opts.expiresAt ?? null,
    quotaMonthly: opts.quotaMonthly ?? 1000,
    ...(opts.applicationId ? { applicationId: opts.applicationId } : {}),
  })

  return { rawKey, hashedKey, keyPrefix, doc }
}

/**
 * Clean all ezauth-related collections.
 */
export async function cleanAllCollections() {
  const [AuthUser, AuthCode, OAuthAccount, RefreshToken, ApiKey, ApiKeyUsage] = await Promise.all([
    getAuthUserModel(),
    getAuthCodeModel(),
    getOAuthAccountModel(),
    getRefreshTokenModel(),
    getApiKeyModel(),
    getApiKeyUsageModel(),
  ])

  await Promise.all([
    AuthUser.deleteMany({}),
    AuthCode.deleteMany({}),
    OAuthAccount.deleteMany({}),
    RefreshToken.deleteMany({}),
    ApiKey.deleteMany({}),
    ApiKeyUsage.deleteMany({}),
  ])
}
