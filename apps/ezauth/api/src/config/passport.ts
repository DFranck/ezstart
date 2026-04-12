import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { getApiUrl } from '@ezstart/config/urls'
import jwt from 'jsonwebtoken'
import { OAuthProfile, OAuthService } from '../services/oauth.service.js'
import { logger } from '@ezstart/logger/server'
import { OAUTH_STATE_SECRET, env } from './env.js'

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_CALLBACK_URL =
  env.GOOGLE_CALLBACK_URL || `${getApiUrl('ezauth')}/api/auth/google/callback`

/**
 * Shape of the signed OAuth state token.
 * - `nonce` is mirrored in an httpOnly cookie for CSRF double-submit validation
 * - `app` / `redirectUri` are the legitimate data previously carried in raw JSON
 */
export interface OAuthStateClaims {
  nonce: string
  app: string
  redirectUri?: string
}

/** Verify and decode a signed OAuth state token. Throws on tampering/expiry. */
export function verifyOAuthStateToken(token: string): OAuthStateClaims {
  const payload = jwt.verify(token, OAUTH_STATE_SECRET, { algorithms: ['HS256'] })
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Malformed OAuth state token')
  }
  const { nonce, app, redirectUri } = payload as Record<string, unknown>
  if (typeof nonce !== 'string' || typeof app !== 'string') {
    throw new Error('Malformed OAuth state token')
  }
  return {
    nonce,
    app,
    redirectUri: typeof redirectUri === 'string' ? redirectUri : undefined,
  }
}

/** Sign an OAuth state token (short TTL = 5 minutes). */
export function signOAuthStateToken(claims: OAuthStateClaims): string {
  return jwt.sign(claims, OAUTH_STATE_SECRET, {
    algorithm: 'HS256',
    expiresIn: '5m',
  })
}

// Configure Google OAuth Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
        passReqToCallback: true, // Allow access to req in callback
      },
      async (req, accessToken, refreshToken, profile, done) => {
        try {
          // Decode the signed state token (CSRF validation already happened in the
          // callback route before Passport runs, but we still need `app` + `redirectUri`).
          const state = typeof req.query.state === 'string' ? req.query.state : ''
          let claims: OAuthStateClaims
          try {
            claims = verifyOAuthStateToken(state)
          } catch (err) {
            logger.warn({ err }, '[OAuth] Invalid state token in Passport callback')
            return done(new Error('Invalid OAuth state'))
          }

          const { app, redirectUri } = claims

          // Verify Google itself confirms the email — prevents account takeover
          // via an unverified Google email matching a local account.
          const rawProfile = (profile._json || {}) as Record<string, unknown>
          const emailVerified =
            rawProfile.email_verified === true ||
            rawProfile.email_verified === 'true' ||
            profile.emails?.[0]?.verified === true

          const oauthProfile: OAuthProfile = {
            provider: 'google',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || '',
            emailVerified: Boolean(emailVerified),
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            avatar: profile.photos?.[0]?.value,
            accessToken,
            refreshToken,
            rawProfile,
          }

          const authCodeResponse = await OAuthService.handleOAuthCallback(
            oauthProfile,
            app,
            redirectUri
          )

          done(null, {
            authCode: authCodeResponse.code,
            redirect_uri: redirectUri,
          } as unknown as Express.User)
        } catch (error) {
          done(error as Error)
        }
      }
    )
  )
} else {
  logger.warn(
    '⚠️  [OAuth] Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET'
  )
}

export default passport
