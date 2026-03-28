import { getAuthUserModel } from '../models/auth-user.js'
import { getOAuthAccountModel } from '../models/oauth-account.js'
import { AuthCodeResponse } from '@ezstart/auth-sdk/server'
import { AuthService } from './auth.service.js'
import { logger } from '@ezstart/logger/server'

export interface OAuthProfile {
  provider: 'google' | 'github' | 'facebook' | 'apple'
  providerId: string
  email: string
  displayName?: string
  firstName?: string
  lastName?: string
  avatar?: string
  accessToken?: string
  refreshToken?: string
  rawProfile: Record<string, any>
}

export class OAuthService {
  /**
   * Handle OAuth callback - Link or create account
   * Returns auth code for SSO flow
   */
  static async handleOAuthCallback(
    profile: OAuthProfile,
    app: string,
    redirectUri?: string
  ): Promise<AuthCodeResponse> {
    const AuthUserModel = await getAuthUserModel()
    const OAuthAccountModel = await getOAuthAccountModel()

    // 1. Check if OAuth account already exists
    const existingOAuthAccount = await OAuthAccountModel.findOne({
      provider: profile.provider,
      providerId: profile.providerId,
    })

    if (existingOAuthAccount) {
      // OAuth account exists → Login with existing user
      logger.info(`✅ [OAuth] Existing ${profile.provider} account found for user ${existingOAuthAccount.userId}`)

      const user = await AuthUserModel.findById(existingOAuthAccount.userId)
      if (!user) {
        throw new Error('User not found for OAuth account')
      }

      // Grant access to the requesting app if not already granted
      if (!user.apps.includes(app)) {
        user.apps.push(app)
        await user.save()
      }

      // Generate auth code for SSO
      return AuthService['generateAuthCode'](user._id!.toString(), app, redirectUri)
    }

    // 2. Check if user exists with same email (account linking)
    const existingUser = await AuthUserModel.findOne({ email: profile.email })

    if (existingUser) {
      // User exists with same email → Link OAuth account
      logger.info(`🔗 [OAuth] Linking ${profile.provider} account to existing user ${existingUser._id}`)

      const oauthAccount = new OAuthAccountModel({
        userId: existingUser._id,
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        displayName: profile.displayName,
        avatar: profile.avatar,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        profile: profile.rawProfile,
      })

      await oauthAccount.save()

      // Update user avatar if not set
      if (!existingUser.avatar && profile.avatar) {
        existingUser.avatar = profile.avatar
        await existingUser.save()
      }

      // Grant access to the requesting app
      if (!existingUser.apps.includes(app)) {
        existingUser.apps.push(app)
        await existingUser.save()
      }

      return AuthService['generateAuthCode'](existingUser._id!.toString(), app, redirectUri)
    }

    // 3. Create new user + OAuth account
    logger.info(`✨ [OAuth] Creating new user from ${profile.provider} account`)

    // Generate unique username from email or displayName
    const baseUsername = profile.email.split('@')[0] || profile.displayName?.replace(/\s+/g, '').toLowerCase()
    let username = baseUsername || 'user'
    let counter = 1

    // Ensure username is unique
    while (await AuthUserModel.findOne({ username })) {
      username = `${baseUsername}${counter}`
      counter++
    }

    const newUser = new AuthUserModel({
      email: profile.email,
      username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      isVerified: true, // OAuth users are pre-verified
      apps: [app],
      // passwordHash is optional for OAuth-only users
    })

    await newUser.save()

    // Create OAuth account link
    const oauthAccount = new OAuthAccountModel({
      userId: newUser._id,
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      displayName: profile.displayName,
      avatar: profile.avatar,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
      profile: profile.rawProfile,
    })

    await oauthAccount.save()

    return AuthService['generateAuthCode'](newUser._id!.toString(), app, redirectUri)
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

    // Check if user has a password (can't unlink if OAuth-only)
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
