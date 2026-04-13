import { z } from 'zod'

/**
 * Supported locales for user-facing emails (en/fr/vi).
 * Kept in sync with `SupportedLocale` from `@ezstart/email-service`.
 */
export const supportedLocaleSchema = z
  .enum(['en', 'fr', 'vi'])
  .describe('Locale for user-facing emails (en/fr/vi, default en)')

/**
 * Per-send email overrides forwarded to `@ezstart/email-service` templates.
 * Mirrors `EmailTemplateOverrides` in `@ezstart/email-service`.
 */
export const emailOverrideSchema = z
  .object({
    subject: z.string().optional().describe('Override email subject'),
    heading: z.string().optional().describe('Override email heading'),
    intro: z.string().optional().describe('Override email intro paragraph'),
    ctaLabel: z.string().optional().describe('Override email CTA button label'),
    outro: z.string().optional().describe('Override email outro paragraph'),
    from: z.string().email().optional().describe('Override sender email'),
    replyTo: z.string().email().optional().describe('Override reply-to address'),
    bodyHtml: z.string().optional().describe('Override entire HTML body'),
  })
  .describe('Optional per-send email overrides (campaign / branded emails)')

// Request schemas
export const loginRequestSchema = z.object({
  email: z.string().min(1, 'Email or username is required').describe('Email or username'),
  password: z.string().min(1).describe('User password'),
  app: z.string().min(1).describe('Application requesting authentication'),
  redirect_uri: z.string().url().optional().describe('OAuth redirect URI'),
})

export const registerRequestSchema = z.object({
  email: z.string().email().describe('User email address'),
  username: z.string().min(1).describe('Unique username'),
  password: z.string().min(8).describe('User password (minimum 8 characters)'),
  firstName: z.string().optional().describe('User first name'),
  lastName: z.string().optional().describe('User last name'),
  app: z.string().min(1).describe('Application requesting authentication'),
  redirect_uri: z.string().url().optional().describe('OAuth redirect URI'),
  promoCode: z.string().optional().describe('Promo code from referral/campaign'),
  locale: supportedLocaleSchema.optional().default('en'),
  emailOverride: emailOverrideSchema.optional(),
})

export const forgotPasswordRequestSchema = z.object({
  email: z.string().email('Invalid email format').describe('User email address'),
  app: z.string().optional().describe('App requesting the password reset'),
  redirect_uri: z.string().url().optional().describe('Redirect URI to return to after reset'),
  locale: supportedLocaleSchema.optional().default('en'),
  emailOverride: emailOverrideSchema.optional(),
})

export const sendVerificationRequestSchema = z.object({
  app: z.string().optional().describe('App requesting the verification email'),
  redirect_uri: z
    .string()
    .url()
    .optional()
    .describe('Redirect URI to return to after verification'),
  locale: supportedLocaleSchema.optional().default('en'),
  emailOverride: emailOverrideSchema.optional(),
})

export const quickSignupRequestSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(50, 'Username must be 50 characters or less')
    .describe('Unique username'),
  email: z.string().email('Invalid email format').describe('User email address'),
  app: z.string().min(1, 'App name is required').describe('App requesting signup'),
  promoCode: z.string().optional().describe('Promo code from referral/campaign'),
  locale: supportedLocaleSchema.optional().default('en'),
  emailOverride: emailOverrideSchema.optional(),
})

export const tokenRequestSchema = z.object({
  code: z.string().min(1).describe('Authorization code from login/register'),
  app: z.string().min(1).describe('Application requesting token'),
  redirect_uri: z.string().url().optional().describe('OAuth redirect URI'),
})

export const verifyRequestSchema = z.object({
  token: z.string().min(1).describe('JWT token to verify'),
  app: z.string().optional().describe('Application to check access for'),
})

// Response schemas
export const authUserSchema = z
  .object({
    _id: z.string().describe('User ID'),
    email: z.string().describe('User email'),
    username: z.string().describe('Username'),
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    avatar: z.string().optional().describe('Avatar URL'),
    isVerified: z.boolean().describe('Email verification status'),
    apps: z.array(z.string()).describe('Accessible applications'),
    // RBAC fields
    roles: z.array(z.string()).optional().describe('User roles (superadmin, admin, manager, etc.)'),
    permissions: z.array(z.string()).optional().describe('User permissions'),
    features: z.array(z.string()).optional().describe('Enabled features'),
    organizationId: z.string().optional().describe('Organization ID'),
    managedBy: z.string().optional().describe('Manager user ID'),
    createdAt: z.string().describe('Account creation timestamp'),
    updatedAt: z.string().describe('Last update timestamp'),
  })
  .describe('User information')

export const authCodeResponseSchema = z.object({
  success: z.boolean().describe('Request success status'),
  code: z.string().describe('Authorization code'),
  expires_at: z.string().describe('Code expiration timestamp'),
  message: z.string().describe('Success message'),
})

export const tokenResponseSchema = z.object({
  success: z.boolean().describe('Request success status'),
  access_token: z.string().describe('JWT access token'),
  token_type: z.literal('Bearer').describe('Token type'),
  expires_in: z.number().describe('Token expiration in seconds'),
  user: authUserSchema,
})

export const userResponseSchema = z.object({
  success: z.boolean().describe('Request success status'),
  user: authUserSchema,
})

export const verifyResponseSchema = z.object({
  success: z.boolean().describe('Request success status'),
  valid: z.boolean().describe('Token validity status'),
  payload: z
    .object({
      userId: z.string().describe('User ID'),
      email: z.string().describe('User email'),
      username: z.string().describe('Username'),
      apps: z.array(z.string()).describe('Accessible applications'),
      exp: z.number().describe('Token expiration timestamp'),
    })
    .optional()
    .describe('Decoded token payload'),
})

export const errorResponseSchema = z.object({
  success: z.literal(false).describe('Request success status'),
  error: z.string().describe('Error message'),
})
