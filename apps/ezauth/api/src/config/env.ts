/**
 * Centralized, validated runtime environment for the EZAuth API.
 *
 * Fails fast at boot time if a required secret is missing or obviously weak.
 * Import `env` instead of reaching into `process.env` directly.
 */

import { z } from 'zod'
import { logger } from '@ezstart/logger/server'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Secrets (required)
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 chars'),
  OAUTH_STATE_SECRET: z.string().min(16, 'OAUTH_STATE_SECRET must be at least 16 chars'),

  // Optional
  OAUTH_ENCRYPTION_KEY: z.string().optional(),
  ACCESS_TOKEN_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'ACCESS_TOKEN_EXPIRES_IN must look like 15m / 1h / 7d')
    .default('15m'),

  COOKIE_DOMAIN: z.string().optional(),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  SSO_ALLOWED_REDIRECTS: z.string().optional(),

  // Feature flag — when true, /sso/authorize and /sso/exchange refuse users
  // whose email is not yet verified. Default false so existing unverified
  // production users are not locked out; flip to true after user migration.
  REQUIRE_VERIFIED_EMAIL_FOR_SSO: z.coerce.boolean().default(false),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  SENTRY_DSN: z.string().optional(),
})

export type AppEnv = z.infer<typeof envSchema>

function loadEnv(): AppEnv {
  // Provide a test fallback so unit tests that don't load .env.test still work.
  // Production and dev must supply a real OAUTH_STATE_SECRET.
  if (!process.env.OAUTH_STATE_SECRET && process.env.NODE_ENV === 'test') {
    process.env.OAUTH_STATE_SECRET = 'test-oauth-state-secret-do-not-use-in-prod'
  }
  // Same fallback for JWT_SECRET in tests (belt-and-suspenders alongside .env.test).
  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'test') {
    process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod'
  }

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    logger.error(`❌ Invalid environment configuration:\n${issues}`)
    throw new Error('Invalid environment configuration — see logs above')
  }
  return result.data
}

export const env: AppEnv = loadEnv()

// Re-exports for ergonomic access
export const JWT_SECRET = env.JWT_SECRET
export const OAUTH_STATE_SECRET = env.OAUTH_STATE_SECRET
