import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { OAuthProfile, OAuthService } from '../services/oauth.service.js'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const GOOGLE_CALLBACK_URL =
  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5010/api/auth/google/callback'

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
          // Extract app and redirect_uri from state parameter
          const state = req.query.state as string
          const { app, redirect_uri } = state ? JSON.parse(state) : { app: 'ezstart' }

          const oauthProfile: OAuthProfile = {
            provider: 'google',
            providerId: profile.id,
            email: profile.emails?.[0]?.value || '',
            displayName: profile.displayName,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            avatar: profile.photos?.[0]?.value,
            accessToken,
            refreshToken,
            rawProfile: profile._json,
          }

          // Handle OAuth callback (link or create account)
          const authCodeResponse = await OAuthService.handleOAuthCallback(
            oauthProfile,
            app,
            redirect_uri
          )

          // Pass auth code to callback
          done(null, { authCode: authCodeResponse.code, redirect_uri })
        } catch (error) {
          done(error as Error)
        }
      }
    )
  )
} else {
  console.warn(
    '⚠️  [OAuth] Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET'
  )
}

export default passport
