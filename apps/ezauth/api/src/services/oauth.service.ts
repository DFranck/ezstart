import { getAuthUserModel } from '../models/auth-user.js'
import { getOAuthAccountModel } from '../models/oauth-account.js'
import { AuthCodeResponse } from '@ezstart/auth-sdk/server'
import { AuthService } from './auth.service.js'
import { AuditLogService } from './audit-log.service.js'
import { logger } from '@ezstart/logger/server'
import { isValidAvatarUrl } from '../utils/avatar.js'

/**
 * Optional flow context forwarded by the OAuth callback. Defaults to
 * `intent: 'signin'` for backwards compatibility.
 */
export interface OAuthFlowContext {
  intent?: 'signin' | 'link'
  /**
   * Authenticated user the caller is linking the provider to. Required
   * when `intent === 'link'`. The route layer extracts this from the
   * active session BEFORE the redirect to Google and signs it into the
   * state JWT, so by the time we read it here it is already trusted.
   */
  linkUserId?: string
}

/**
 * Returns the avatar only if it passes `isValidAvatarUrl` validation.
 * Keeps untrusted provider URLs out of the DB without breaking account creation.
 */
function safeAvatar(avatar: string | undefined): string | undefined {
  if (!avatar) return undefined
  return isValidAvatarUrl(avatar) ? avatar : undefined
}

export interface OAuthProfile {
  provider: 'google' | 'github' | 'facebook' | 'apple'
  providerId: string
  email: string
  /** Whether the provider has independently verified this email address. */
  emailVerified: boolean
  displayName?: string
  firstName?: string
  lastName?: string
  avatar?: string
  accessToken?: string
  refreshToken?: string
  rawProfile: Record<string, unknown>
}

/**
 * Error thrown when auto-linking is refused for safety reasons.
 * The route layer translates this to a 400 with a clear user message.
 */
export class OAuthLinkingRefusedError extends Error {
  code = 'OAUTH_LINKING_REFUSED' as const
  constructor(message: string) {
    super(message)
    this.name = 'OAuthLinkingRefusedError'
  }
}

export class OAuthService {
  /**
   * Handle OAuth callback — link or create account. Returns auth code for SSO flow.
   *
   * Security: auto-linking only happens when BOTH sides have verified the email.
   * If either side is unverified, we refuse and require the user to log in first
   * (explicit linkage flow). This prevents an attacker who controls an unverified
   * Google account from hijacking a local account sharing the same email.
   *
   * When `flow.intent === 'link'`, the caller is already authenticated and
   * explicitly requested to link this provider to their existing account
   * (`flow.linkUserId`) — the email-collision refusal is bypassed because
   * the session itself is the proof of ownership.
   */
  static async handleOAuthCallback(
    profile: OAuthProfile,
    app: string,
    redirectUri?: string,
    flow: OAuthFlowContext = {}
  ): Promise<AuthCodeResponse> {
    const AuthUserModel = await getAuthUserModel()
    const OAuthAccountModel = await getOAuthAccountModel()

    // 0. Explicit link flow — bypass the email-collision refusal because the
    //    caller proved account ownership via the session that was checked
    //    server-side BEFORE this redirect was issued (state JWT carries the
    //    userId signed by us, so it cannot be tampered with).
    if (flow.intent === 'link' && flow.linkUserId) {
      const linkedUser = await AuthUserModel.findById(flow.linkUserId)
      if (!linkedUser) {
        throw new OAuthLinkingRefusedError(
          'The user account you tried to link no longer exists. Please sign in again and retry.'
        )
      }

      // If the provider is already linked to ANY user, refuse — preserves
      // the "one provider account per user" invariant enforced by the
      // unique index on { provider, providerId }.
      const existingOAuthAccount = await OAuthAccountModel.findOne({
        provider: profile.provider,
        providerId: profile.providerId,
      })
      if (existingOAuthAccount) {
        if (existingOAuthAccount.userId.toString() !== linkedUser._id!.toString()) {
          throw new OAuthLinkingRefusedError(
            `This ${profile.provider} account is already linked to a different user.`
          )
        }
        // Already linked to the same user — idempotent success.
        return AuthService.generateAuthCodePublic(linkedUser._id!.toString(), app, redirectUri)
      }

      // Same safety as auto-link path: provider MUST have verified the email.
      if (!profile.emailVerified) {
        throw new OAuthLinkingRefusedError(
          `Your ${profile.provider} account has no verified email. Please verify it with the provider, then retry.`
        )
      }

      try {
        await this.persistLinkedAccount(linkedUser, profile, app)
      } catch (err) {
        // Race-condition guard: a parallel callback may have linked the
        // same provider id between our findOne above and the insert.
        if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
          throw new OAuthLinkingRefusedError(`This ${profile.provider} account is already linked.`)
        }
        throw err
      }
      void AuditLogService.create({
        userId: linkedUser._id!.toString(),
        action: 'oauth_link',
        appName: app,
        metadata: { provider: profile.provider, providerEmail: profile.email },
      })
      return AuthService.generateAuthCodePublic(linkedUser._id!.toString(), app, redirectUri)
    }

    // 1. Existing OAuth link → login
    const existingOAuthAccount = await OAuthAccountModel.findOne({
      provider: profile.provider,
      providerId: profile.providerId,
    })

    if (existingOAuthAccount) {
      logger.info(
        `✅ [OAuth] Existing ${profile.provider} account found for user ${existingOAuthAccount.userId}`
      )

      const user = await AuthUserModel.findById(existingOAuthAccount.userId)
      if (!user) {
        throw new Error('User not found for OAuth account')
      }

      if (!user.apps.includes(app)) {
        user.apps.push(app)
        await user.save()
      }

      void AuditLogService.create({
        userId: user._id!.toString(),
        action: 'login',
        appName: app,
        metadata: { provider: profile.provider, method: 'oauth' },
      })

      return AuthService.generateAuthCodePublic(user._id!.toString(), app, redirectUri)
    }

    // 2. Local user exists with this email → only auto-link if BOTH verified
    const existingUser = await AuthUserModel.findOne({ email: profile.email })

    if (existingUser) {
      // QuickSignup accounts (random password, never verified) can be safely
      // auto-linked when the OAuth provider has verified the email — the local
      // account was never "really" owned by the user via credentials.
      const isQuickSignupGhost =
        !existingUser.isVerified && !existingUser.hasSetOwnPassword && profile.emailVerified

      if (isQuickSignupGhost) {
        logger.info(
          `🔗 [OAuth] Auto-linking ${profile.provider} to quickSignup ghost account ${existingUser._id} — provider verified email`
        )
        existingUser.isVerified = true
        await existingUser.save()
      } else if (!profile.emailVerified || !existingUser.isVerified) {
        logger.warn(
          {
            provider: profile.provider,
            email: profile.email,
            providerEmailVerified: profile.emailVerified,
            localVerified: existingUser.isVerified,
          },
          '[OAuth] Refusing to auto-link — unverified email on one or both sides'
        )
        throw new OAuthLinkingRefusedError(
          'An account with this email already exists. Please log in first, then link your Google account from your profile.'
        )
      }

      logger.info(
        `🔗 [OAuth] Linking ${profile.provider} account to verified user ${existingUser._id}`
      )

      try {
        await this.persistLinkedAccount(existingUser, profile, app)
      } catch (err) {
        if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
          // Concurrent callback won the race — fall through to a normal login.
          logger.warn(
            { provider: profile.provider, providerId: profile.providerId },
            '[OAuth] Auto-link race lost — falling back to login'
          )
          return AuthService.generateAuthCodePublic(existingUser._id!.toString(), app, redirectUri)
        }
        throw err
      }
      void AuditLogService.create({
        userId: existingUser._id!.toString(),
        action: 'oauth_link',
        appName: app,
        metadata: {
          provider: profile.provider,
          providerEmail: profile.email,
          autoLinked: true,
        },
      })

      return AuthService.generateAuthCodePublic(existingUser._id!.toString(), app, redirectUri)
    }

    // 3. Brand-new user — still require the provider to have verified the email
    if (!profile.emailVerified) {
      logger.warn(
        { provider: profile.provider, email: profile.email },
        '[OAuth] Refusing to create account from unverified provider email'
      )
      throw new OAuthLinkingRefusedError(
        'Your Google account has no verified email. Please verify it with Google, then try again.'
      )
    }

    logger.info(`✨ [OAuth] Creating new user from ${profile.provider} account`)

    // Generate unique username from email or displayName
    const baseUsername =
      profile.email.split('@')[0] || profile.displayName?.replace(/\s+/g, '').toLowerCase()
    let username = baseUsername || 'user'
    let counter = 1

    while (await AuthUserModel.findOne({ username })) {
      username = `${baseUsername}${counter}`
      counter++
    }

    const validatedAvatar = safeAvatar(profile.avatar)

    const newUser = new AuthUserModel({
      email: profile.email,
      username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: validatedAvatar,
      isVerified: true, // Provider confirmed above
      apps: [app],
    })

    await newUser.save()

    const oauthAccount = new OAuthAccountModel({
      userId: newUser._id,
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      displayName: profile.displayName,
      avatar: validatedAvatar,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      profile: profile.rawProfile,
    })

    try {
      await oauthAccount.save()
    } catch (err) {
      if (err instanceof Error && 'code' in err && (err as { code: number }).code === 11000) {
        // A parallel callback created the same provider link between our
        // earlier findOne and now — log it and continue (the user record
        // is already there, the linked one will surface on next sign-in).
        logger.warn(
          { provider: profile.provider, providerId: profile.providerId },
          '[OAuth] New-user OAuth link race lost — surfaced as duplicate key'
        )
      } else {
        throw err
      }
    }

    return AuthService.generateAuthCodePublic(newUser._id!.toString(), app, redirectUri)
  }

  /**
   * Persist a new OAuthAccount document for `user` and best-effort backfill
   * the missing avatar / app access. Extracted so the auto-link and explicit
   * `intent=link` paths share the same persistence logic.
   *
   * @internal
   */
  private static async persistLinkedAccount(
    user: Awaited<ReturnType<typeof getAuthUserModel>>['prototype'] & {
      _id: unknown
      avatar?: string
      apps: string[]
      save(): Promise<unknown>
    },
    profile: OAuthProfile,
    app: string
  ): Promise<void> {
    const OAuthAccountModel = await getOAuthAccountModel()
    const validatedAvatar = safeAvatar(profile.avatar)

    const oauthAccount = new OAuthAccountModel({
      userId: user._id,
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      displayName: profile.displayName,
      avatar: validatedAvatar,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      profile: profile.rawProfile,
    })

    await oauthAccount.save()

    if (!user.avatar && validatedAvatar) {
      user.avatar = validatedAvatar
      await user.save()
    }

    if (!user.apps.includes(app)) {
      user.apps.push(app)
      await user.save()
    }
  }

  /**
   * Get all OAuth accounts for a user
   */
  static async getUserOAuthAccounts(userId: string) {
    const OAuthAccountModel = await getOAuthAccountModel()
    return OAuthAccountModel.find({ userId })
  }

  /**
   * Unlink OAuth account from user
   */
  static async unlinkOAuthAccount(userId: string, provider: string) {
    const OAuthAccountModel = await getOAuthAccountModel()
    const AuthUserModel = await getAuthUserModel()

    const user = await AuthUserModel.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    if (!user.passwordHash) {
      throw new Error('Cannot unlink OAuth account - set a password first')
    }

    const result = await OAuthAccountModel.deleteOne({ userId, provider })
    return result.deletedCount > 0
  }
}
