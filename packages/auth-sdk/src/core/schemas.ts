/**
 * Core Zod schemas for auth validation.
 *
 * These schemas are self-contained (no @ezstart/* imports).
 * Response schemas for API documentation and runtime validation.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Response schemas
// ---------------------------------------------------------------------------

export const authUserSchema = z
  .object({
    _id: z.string().describe('User ID'),
    email: z.string().describe('User email'),
    username: z.string().describe('Username'),
    firstName: z.string().optional().describe('First name'),
    lastName: z.string().optional().describe('Last name'),
    avatar: z.string().optional().describe('Avatar URL'),
    isVerified: z.boolean().describe('Email verification status'),
    twoFactorEnabled: z
      .boolean()
      .optional()
      .describe(
        '2FA enrollment status (TOTP enabled). Optional for backward compatibility — pre-2FA_MANDATORY_ADMIN-001 (2026-05-01) responses omit the field.'
      ),
    apps: z.array(z.string()).describe('Accessible applications'),
    roles: z.array(z.string()).optional().describe('User roles'),
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
