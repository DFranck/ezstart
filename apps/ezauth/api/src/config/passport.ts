import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { getApiUrl } from '@ezstart/config/urls'
import jwt from 'jsonwebtoken'
import { OAuthLinkingRefusedError, OAuthProfile, OAuthService } from '../services/oauth.service.js'
import { logger } from '@ezstart/logger/server'
import { OAUTH_STATE_SECRET, env } from './env.js'

const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_CALLBACK_URL =
  env.GOOGLE_CALLBACK_URL || `${getApiUrl('ezauth')}/api/auth/google/callback`

/**
 * Single source of truth for the OAuth state cookie name. Both the
 * authorize route (which sets it) and the callback route (which validates
 * and clears it) MUST import this constant — duplicating the literal
 * string in two places risks a silent CSRF bypass if one drifts.
 */
export const OAUTH_STATE_COOKIE = 'oauth_state'

/**
 * Shape of the signed OAuth state token.
 * - `nonce` is mirrored in an httpOnly cookie for CSRF double-submit validation
 * - `app` / `redirectUri` are the legitimate data previously carried in raw JSON
 * - `intent` is `'signin'` (default OAuth login/signup) or `'link'` (link the
 *   provider to an existing authenticated user — `linkUserId` MUST be set)
 * - `linkUserId` is the user ID captured server-side from the active session
 *   when the authorize route saw `intent=link`. Trusting this client-side
 *   would be unsafe; we sign it into the state JWT precisely so the callback
 *   can use it without re-reading any cookie.
 * - `codeChallenge` / `codeChallengeMethod` are the PKCE (RFC 7636) binding
 *   the SDK committed to BEFORE redirecting to Google. Carried INSIDE the
 *   signed state (not a raw query param on the callback) so an attacker who
 *   intercepts the callback cannot strip or substitute the challenge without
 *   breaking the HMAC signature — anti-downgrade. Absent ⇒ the callback mints
 *   a legacy (no-PKCE) auth code (backward compatible with older SDKs).
 */
export interface OAuthStateClaims {
  nonce: string
  app: string
  redirectUri?: string
  intent?: 'signin' | 'link'
  linkUserId?: string
  /** PKCE `code_challenge` = BASE64URL(SHA256(verifier)) (RFC 7636 §4.2). */
  codeChallenge?: string
  /** PKCE method — only `'S256'` is ever signed (plain rejected at the route). */
  codeChallengeMethod?: 'S256'
}

/** Verify and decode a signed OAuth state token. Throws on tampering/expiry. */
export function verifyOAuthStateToken(token: string): OAuthStateClaims {
  const payload = jwt.verify(token, OAUTH_STATE_SECRET, { algorithms: ['HS256'] })
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Malformed OAuth state token')
  }
  const { nonce, app, redirectUri, intent, linkUserId, codeChallenge, codeChallengeMethod } =
    payload as Record<string, unknown>
  if (typeof nonce !== 'string' || typeof app !== 'string') {
    throw new Error('Malformed OAuth state token')
  }
  const resolvedIntent = intent === 'link' || intent === 'signin' ? intent : undefined
  // PKCE — only surface a challenge when BOTH the value is a string AND the
  // method is the single supported `'S256'`. A tampered state that drops the
  // method (or sets `'plain'`) yields no challenge here → the callback mints a
  // legacy code rather than silently honouring a downgraded binding.
  const resolvedChallenge = typeof codeChallenge === 'string' ? codeChallenge : undefined
  const resolvedMethod = codeChallengeMethod === 'S256' ? 'S256' : undefined
  return {
    nonce,
    app,
    redirectUri: typeof redirectUri === 'string' ? redirectUri : undefined,
    intent: resolvedIntent,
    linkUserId: typeof linkUserId === 'string' ? linkUserId : undefined,
    ...(resolvedChallenge && resolvedMethod
      ? { codeChallenge: resolvedChallenge, codeChallengeMethod: resolvedMethod }
      : {}),
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

          const { app, redirectUri, intent, linkUserId, codeChallenge, codeChallengeMethod } =
            claims

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
            redirectUri,
            {
              intent: intent ?? 'signin',
              linkUserId,
              // PKCE (RFC 7636) — forward the challenge the SDK committed to at
              // /google (authorize) so the minted auth code REQUIRES a matching
              // verifier on /token. Carried verbatim from the signed state →
              // tamper-proof. Absent ⇒ legacy no-PKCE code.
              ...(codeChallenge && codeChallengeMethod
                ? { pkce: { codeChallenge, codeChallengeMethod } }
                : {}),
            }
          )

          done(null, {
            authCode: authCodeResponse.code,
            redirect_uri: redirectUri,
          } as unknown as Express.User)
        } catch (error) {
          // Surface OAuthLinkingRefusedError with a stable error code so the
          // callback handler can map it to a friendly query param on the
          // user-facing error page, instead of the generic `oauth_failed`.
          if (error instanceof OAuthLinkingRefusedError) {
            const tagged = new Error(error.message) as Error & { code?: string }
            tagged.code = error.code
            return done(tagged)
          }
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
